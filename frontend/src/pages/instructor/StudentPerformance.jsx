
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../services/api";

function StatCard({ title, value, description }) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{description}</p>
        </article>
    );
}

function StatusBadge({ status }) {
    const styles = {
        active: "bg-emerald-50 text-emerald-700",
        completed: "bg-blue-50 text-blue-700",
        cancelled: "bg-slate-100 text-slate-600",
    };

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${styles[status] || "bg-slate-100 text-slate-700"
                }`}
        >
            {(status || "unknown").replaceAll("_", " ")}
        </span>
    );
}

export default function StudentPerformance() {
    const { courseId } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        let active = true;

        async function loadStudents() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get(
                    `/instructor/courses/${courseId}/students`
                );

                if (active) setData(response.data);
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.error ||
                        "Unable to load student performance. Please try again."
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadStudents();

        return () => {
            active = false;
        };
    }, [courseId]);

    if (loading) {
        return (
            <main className="p-6">
                <div className="mx-auto max-w-7xl rounded-2xl border bg-white p-8">
                    <p className="text-sm text-slate-600">
                        Loading enrolled students...
                    </p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="p-6">
                <div className="mx-auto max-w-7xl">
                    <button
                        onClick={() => navigate("/instructor/students")}
                        className="mb-5 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                        ← Back to Student Performance
                    </button>

                    <div
                        role="alert"
                        className="rounded-xl border border-rose-200 bg-rose-50 p-5"
                    >
                        <h1 className="font-bold text-rose-800">
                            Could not load students
                        </h1>
                        <p className="mt-2 text-sm text-rose-700">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    const students = data?.students || [];

    const filteredStudents = students.filter((student) => {
        const query = search.trim().toLowerCase();
        return (
            !query ||
            student.name?.toLowerCase().includes(query) ||
            student.email?.toLowerCase().includes(query)
        );
    });

    const completedStudents = students.filter(
        (student) => student.enrollment_status === "completed"
    ).length;

    const scoredStudents = students.filter(
        (student) => typeof student.average_quiz_score === "number"
    );

    const averageScore = scoredStudents.length
        ? (
            scoredStudents.reduce(
                (sum, student) => sum + student.average_quiz_score,
                0
            ) / scoredStudents.length
        ).toFixed(1)
        : null;

    const submittedQuizzes = students.reduce(
        (sum, student) => sum + (student.submitted_quizzes || 0),
        0
    );

    function openStudent(student) {
        navigate(
            `/instructor/courses/${courseId}/students/${student.id}`
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 p-5 text-slate-900 sm:p-8">
            <div className="mx-auto max-w-7xl">
                <button
                    onClick={() => navigate("/instructor/students")}
                    className="mb-5 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                    ← Back to Student Performance
                </button>

                <header className="mb-8">
                    <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
                        Student performance
                    </p>
                    <h1 className="mt-2 text-3xl font-bold">
                        {data?.course_title || "Course students"}
                    </h1>
                    <p className="mt-2 text-slate-500">
                        Select a student to see their individual performance and learning track.
                    </p>
                </header>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Enrolled students"
                        value={students.length}
                        description="Students in this course"
                    />
                    <StatCard
                        title="Completed enrolments"
                        value={completedStudents}
                        description="Students who completed the course"
                    />
                    <StatCard
                        title="Average quiz score"
                        value={averageScore === null ? "—" : `${averageScore}%`}
                        description="Across students with scores"
                    />
                    <StatCard
                        title="Quiz submissions"
                        value={submittedQuizzes}
                        description="Submitted attempts across students"
                    />
                </section>

                <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold">Enrolled students</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {filteredStudents.length} student
                                {filteredStudents.length === 1 ? "" : "s"} found
                            </p>
                        </div>

                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by name or email..."
                            aria-label="Search students"
                            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:max-w-xs"
                        />
                    </div>

                    {students.length === 0 ? (
                        <div className="p-10 text-center">
                            <h3 className="font-semibold">No enrolled students yet</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                Students will appear here after enrolling in this course.
                            </p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="p-10 text-center text-sm text-slate-500">
                            No students match your search.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-5 py-4">Student</th>
                                        <th className="px-5 py-4">Enrolment</th>
                                        <th className="px-5 py-4">Lesson progress</th>
                                        <th className="px-5 py-4">Quizzes submitted</th>
                                        <th className="px-5 py-4">Average score</th>
                                        <th className="px-5 py-4">Action</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {filteredStudents.map((student) => (
                                        <tr
                                            key={student.id}
                                            className="cursor-pointer hover:bg-indigo-50/50"
                                            onClick={() => openStudent(student)}
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-semibold">{student.name}</p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {student.email}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <StatusBadge status={student.enrollment_status} />
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="font-semibold">
                                                    {student.completion_percentage ?? 0}%
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {student.completed_lessons ?? 0} of{" "}
                                                    {student.total_lessons ?? 0} lessons
                                                </p>
                                                <div className="mt-2 h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className="h-full rounded-full bg-indigo-600"
                                                        style={{
                                                            width: `${Math.min(
                                                                100,
                                                                Math.max(
                                                                    0,
                                                                    student.completion_percentage || 0
                                                                )
                                                            )}%`,
                                                        }}
                                                    />
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                {student.submitted_quizzes ?? 0}
                                            </td>

                                            <td className="px-5 py-4 font-semibold">
                                                {student.average_quiz_score == null
                                                    ? "—"
                                                    : `${student.average_quiz_score}%`}
                                            </td>

                                            <td className="px-5 py-4">
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        openStudent(student);
                                                    }}
                                                    className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                                                >
                                                    View performance →
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
