
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import {
    fetchInstructorAnalytics,
} from "../../features/instructor/instructorAnalyticsSlice";

function StatCard({ title, value, description }) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
        </article>
    );
}

function StatusBadge({ status }) {
    const styles = {
        published: "bg-emerald-50 text-emerald-700",
        draft: "bg-slate-100 text-slate-700",
        pending_review: "bg-amber-50 text-amber-700",
        rejected: "bg-rose-50 text-rose-700",
    };

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-700"
                }`}
        >
            {(status || "unknown").replaceAll("_", " ")}
        </span>
    );
}

export default function InstructorDashboard() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { data, loading, error } = useSelector(
        (state) => state.instructorAnalytics
    );

    useEffect(() => {
        dispatch(fetchInstructorAnalytics());
    }, [dispatch]);

    function handleViewStudents(courseId) {
        navigate(`/instructor/courses/${courseId}/students`);
    }

    const courses = data?.courses || {};
    const enrollments = data?.enrollments || {};
    const quizzes = data?.quizzes || {};
    const attempts = data?.attempts || {};
    const perCourse = data?.per_course || [];

    function formatScore(score) {
        return score == null ? "—" : `${score}%`;
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Instructor Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Review your courses and learner activity.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => dispatch(fetchInstructorAnalytics())}
                    disabled={loading}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? "Refreshing..." : "Refresh analytics"}
                </button>
            </div>

            {error && (
                <section
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 p-4"
                >
                    <p className="font-semibold text-rose-800">
                        Could not load analytics
                    </p>
                    <p className="mt-1 text-sm text-rose-700">{error}</p>

                    <button
                        type="button"
                        onClick={() => dispatch(fetchInstructorAnalytics())}
                        className="mt-3 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"
                    >
                        Try again
                    </button>
                </section>
            )}

            {loading && !data ? (
                <section
                    aria-live="polite"
                    className="rounded-2xl border border-slate-200 bg-white p-10 text-center"
                >
                    <p className="font-semibold text-slate-700">
                        Loading your analytics...
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                        Fetching your course and learner statistics.
                    </p>
                </section>
            ) : data ? (
                <>
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            title="Total courses"
                            value={courses.total ?? 0}
                            description={`${courses.published ?? 0} published`}
                        />
                        <StatCard
                            title="Total enrolments"
                            value={enrollments.total ?? 0}
                            description={`${enrollments.completed ?? 0} completed`}
                        />
                        <StatCard
                            title="Total quizzes"
                            value={quizzes.total ?? 0}
                            description="Across your courses"
                        />
                        <StatCard
                            title="Quiz attempts"
                            value={attempts.total ?? 0}
                            description={`${attempts.submitted ?? 0} submitted`}
                        />
                    </section>

                    <section className="grid gap-4 lg:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
                            <h2 className="text-lg font-bold">Course status</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Current status of the courses you own.
                            </p>

                            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {[
                                    ["Published", courses.published ?? 0],
                                    ["Draft", courses.draft ?? 0],
                                    ["In review", courses.pending_review ?? 0],
                                    ["Rejected", courses.rejected ?? 0],
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-xl bg-slate-50 p-4">
                                        <p className="text-sm text-slate-500">{label}</p>
                                        <p className="mt-2 text-2xl font-bold">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <h2 className="text-lg font-bold">Average quiz score</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Based on submitted quiz attempts.
                            </p>
                            <p className="mt-6 text-4xl font-bold text-indigo-600">
                                {formatScore(data.average_score)}
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                {data.average_score == null
                                    ? "No scored attempts available yet."
                                    : "Average percentage across submitted attempts."}
                            </p>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="border-b border-slate-200 p-5">
                            <h2 className="text-lg font-bold">Performance by course</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Enrolments, quiz activity, learner performance, and average
                                scores for each course.
                            </p>
                        </div>

                        {perCourse.length === 0 ? (
                            <div className="p-10 text-center">
                                <p className="font-semibold text-slate-700">
                                    No courses yet
                                </p>
                                <p className="mt-2 text-sm text-slate-500">
                                    Your course statistics will appear here when you create
                                    courses.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => navigate("/instructor/courses/new")}
                                    className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                                >
                                    Create course
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-5 py-4 font-semibold">Course</th>
                                            <th className="px-5 py-4 font-semibold">Status</th>
                                            <th className="px-5 py-4 font-semibold">Enrolments</th>
                                            <th className="px-5 py-4 font-semibold">Quizzes</th>
                                            <th className="px-5 py-4 font-semibold">Attempts</th>
                                            <th className="px-5 py-4 font-semibold">Avg. score</th>
                                            <th className="px-5 py-4 font-semibold">Students</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {perCourse.map((course) => (
                                            <tr
                                                key={course.course_id}
                                                className="hover:bg-slate-50"
                                            >
                                                <td className="px-5 py-4 font-semibold text-slate-900">
                                                    {course.title || "Untitled course"}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <StatusBadge status={course.status} />
                                                </td>
                                                <td className="px-5 py-4 text-slate-600">
                                                    {course.enrollments?.total ?? 0}
                                                    <span className="text-slate-400">
                                                        {" "}({course.enrollments?.completed ?? 0} completed)
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-slate-600">
                                                    {course.quizzes?.published ?? 0}/
                                                    {course.quizzes?.total ?? 0} published
                                                </td>
                                                <td className="px-5 py-4 text-slate-600">
                                                    {course.attempts?.submitted ?? 0}/
                                                    {course.attempts?.total ?? 0} submitted
                                                </td>
                                                <td className="px-5 py-4 font-semibold text-slate-700">
                                                    {formatScore(course.average_score)}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleViewStudents(course.course_id)
                                                        }
                                                        className="whitespace-nowrap rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                                                    >
                                                        View students
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            ) : !error ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                    <p className="text-slate-600">
                        Analytics are not available yet.
                    </p>
                </section>
            ) : null}
        </div>
    );
}
