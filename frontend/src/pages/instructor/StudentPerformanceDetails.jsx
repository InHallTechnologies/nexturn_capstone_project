
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
        completed: "bg-emerald-50 text-emerald-700",
        active: "bg-blue-50 text-blue-700",
        submitted: "bg-emerald-50 text-emerald-700",
        in_progress: "bg-amber-50 text-amber-700",
        not_started: "bg-slate-100 text-slate-600",
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

function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "Not available"
        : date.toLocaleString();
}

export default function StudentPerformanceDetails() {
    const { courseId, studentId } = useParams();
    const navigate = useNavigate();

    const [student, setStudent] = useState(null);
    const [courseTitle, setCourseTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadStudentDetails() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get(
                    `/instructor/courses/${courseId}/students`
                );

                if (!active) return;

                const students = response.data?.students || [];
                const foundStudent = students.find(
                    (item) => item.id === studentId
                );

                setCourseTitle(response.data?.course_title || "");

                if (!foundStudent) {
                    setError(
                        "This student was not found in the selected course."
                    );
                    setStudent(null);
                    return;
                }

                setStudent(foundStudent);
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.error ||
                        "Unable to load this student's performance."
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadStudentDetails();

        return () => {
            active = false;
        };
    }, [courseId, studentId]);

    function goBack() {
        navigate(`/instructor/courses/${courseId}/students`);
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 p-6">
                <div className="mx-auto max-w-7xl rounded-2xl border bg-white p-8">
                    <p className="text-slate-600">
                        Loading student performance...
                    </p>
                </div>
            </main>
        );
    }

    if (error || !student) {
        return (
            <main className="min-h-screen bg-slate-50 p-6">
                <div className="mx-auto max-w-7xl">
                    <button
                        onClick={goBack}
                        className="mb-5 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                        ← Back to students
                    </button>

                    <div
                        role="alert"
                        className="rounded-xl border border-rose-200 bg-rose-50 p-5"
                    >
                        <h1 className="font-bold text-rose-800">
                            Unable to load student details
                        </h1>
                        <p className="mt-2 text-sm text-rose-700">
                            {error || "Student information is unavailable."}
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    const totalLessons = student.total_lessons || 0;
    const completedLessons = student.completed_lessons || 0;
    const remainingLessons = Math.max(
        0,
        totalLessons - completedLessons
    );

    const attempts = student.quiz_attempts || [];
    const learningTrack = student.learning_track || [];

    const submittedAttempts = attempts.filter(
        (attempt) => attempt.status === "submitted"
    );

    const currentLesson = student.current_lesson || null;

    return (
        <main className="min-h-screen bg-slate-50 p-5 text-slate-900 sm:p-8">
            <div className="mx-auto max-w-7xl">
                <button
                    onClick={goBack}
                    className="mb-6 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                    ← Back
                </button>

                <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
                        Individual student overview
                    </p>

                    <h1 className="mt-2 text-3xl font-bold">
                        {student.name || "Student"}
                    </h1>

                    <p className="mt-2 text-slate-500">{student.email}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <StatusBadge status={student.enrollment_status} />
                        <span className="text-sm text-slate-500">
                            Course: {courseTitle || "Course"}
                        </span>
                    </div>
                </header>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Course progress"
                        value={`${student.completion_percentage ?? 0}%`}
                        description="Lessons completed"
                    />

                    <StatCard
                        title="Completed lessons"
                        value={completedLessons}
                        description={`Out of ${totalLessons} lessons`}
                    />

                    <StatCard
                        title="Remaining lessons"
                        value={remainingLessons}
                        description="Lessons not yet completed"
                    />

                    <StatCard
                        title="Average quiz score"
                        value={
                            student.average_quiz_score == null
                                ? "—"
                                : `${student.average_quiz_score}%`
                        }
                        description={`${submittedAttempts.length} submitted quizzes`}
                    />
                </section>

                <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-bold">Learning overview</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Track the student's progress through the course.
                    </p>

                    <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-slate-700">
                                Overall completion
                            </span>
                            <span className="font-bold text-indigo-700">
                                {student.completion_percentage ?? 0}%
                            </span>
                        </div>

                        <div
                            className="h-3 overflow-hidden rounded-full bg-slate-100"
                            role="progressbar"
                            aria-label="Course completion"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.min(
                                100,
                                Math.max(0, student.completion_percentage || 0)
                            )}
                        >
                            <div
                                className="h-full rounded-full bg-indigo-600 transition-all"
                                style={{
                                    width: `${Math.min(
                                        100,
                                        Math.max(0, student.completion_percentage || 0)
                                    )}%`,
                                }}
                            />
                        </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">Enrolled on</p>
                            <p className="mt-2 font-semibold">
                                {formatDate(student.enrolled_at)}
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">
                                Current learning position
                            </p>

                            {currentLesson ? (
                                <>
                                    <p className="mt-2 font-semibold">
                                        {currentLesson.lesson_title}
                                    </p>
                                    {currentLesson.module_title && (
                                        <p className="mt-1 text-sm text-slate-500">
                                            {currentLesson.module_title}
                                        </p>
                                    )}
                                    <div className="mt-2">
                                        <StatusBadge status={currentLesson.status} />
                                    </div>
                                </>
                            ) : (
                                <p className="mt-2 text-sm text-slate-500">
                                    {totalLessons > 0 && completedLessons === totalLessons
                                        ? "All lessons completed"
                                        : "Current lesson information is not available"}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-bold">Student learning track</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Module-by-module and lesson-by-lesson progress.
                    </p>

                    {learningTrack.length === 0 ? (
                        <div className="mt-5 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5">
                            <p className="font-semibold text-amber-900">
                                Detailed learning track is not available
                            </p>
                            <p className="mt-2 text-sm text-amber-800">
                                Your backend must return a learning_track array containing
                                modules and their lessons. The existing summary fields alone
                                cannot identify each completed lesson.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-6 space-y-6">
                            {learningTrack.map((module, index) => {
                                const lessons = module.lessons || [];
                                const completedInModule = lessons.filter(
                                    (lesson) => lesson.status === "completed"
                                ).length;

                                return (
                                    <article
                                        key={module.module_id || `${module.module_title}-${index}`}
                                        className="rounded-xl border border-slate-200 p-5"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                                                    Module {index + 1}
                                                </p>
                                                <h3 className="mt-1 text-lg font-bold">
                                                    {module.module_title || "Untitled module"}
                                                </h3>
                                            </div>

                                            <span className="text-sm text-slate-500">
                                                {completedInModule} / {lessons.length} completed
                                            </span>
                                        </div>

                                        {lessons.length === 0 ? (
                                            <p className="mt-4 text-sm text-slate-500">
                                                No lessons in this module.
                                            </p>
                                        ) : (
                                            <div className="mt-4 space-y-3">
                                                {lessons.map((lesson) => (
                                                    <div
                                                        key={lesson.id}
                                                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"
                                                    >
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <span
                                                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${lesson.status === "completed"
                                                                    ? "bg-emerald-100 text-emerald-700"
                                                                    : lesson.status === "in_progress"
                                                                        ? "bg-amber-100 text-amber-700"
                                                                        : "bg-slate-200 text-slate-600"
                                                                    }`}
                                                            >
                                                                {lesson.status === "completed"
                                                                    ? "✓"
                                                                    : lesson.status === "in_progress"
                                                                        ? "•"
                                                                        : "○"}
                                                            </span>

                                                            <span className="text-sm font-medium">
                                                                {lesson.title || "Untitled lesson"}
                                                            </span>
                                                        </div>

                                                        <StatusBadge status={lesson.status} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-bold">Quiz history</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Review this student's quiz attempts and scores.
                    </p>

                    {attempts.length === 0 ? (
                        <div className="mt-5 rounded-xl bg-slate-50 p-6 text-center">
                            <p className="font-semibold text-slate-700">
                                No quiz attempts yet
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                Quiz results will appear here after the student attempts a quiz.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-5 overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Quiz</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Score</th>
                                        <th className="px-4 py-3">Percentage</th>
                                        <th className="px-4 py-3">Submitted</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {attempts.map((attempt, index) => (
                                        <tr key={attempt.id || `${attempt.quiz_id}-${index}`}>
                                            <td className="px-4 py-4 font-medium">
                                                {attempt.quiz_title || "Quiz"}
                                            </td>

                                            <td className="px-4 py-4">
                                                <StatusBadge status={attempt.status} />
                                            </td>

                                            <td className="px-4 py-4">
                                                {attempt.score ?? "—"} /{" "}
                                                {attempt.total_questions ?? "—"}
                                            </td>

                                            <td className="px-4 py-4 font-semibold">
                                                {attempt.percentage == null
                                                    ? "—"
                                                    : `${attempt.percentage}%`}
                                            </td>

                                            <td className="px-4 py-4 text-slate-500">
                                                {formatDate(attempt.submitted_at)}
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
