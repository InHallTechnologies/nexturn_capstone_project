import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Send, RefreshCw, AlertCircle } from "lucide-react";

import { fetchMyCourses } from "../../features/instructor/myCoursesSlice";
import { api } from "../../services/api";

function StatusBadge({ status }) {
    const styles = {
        draft: "bg-slate-100 text-slate-700",
        pending_review: "bg-amber-100 text-amber-700",
        approved: "bg-blue-100 text-blue-700",
        published: "bg-emerald-100 text-emerald-700",
        rejected: "bg-rose-100 text-rose-700",
    };

    const labels = {
        draft: "Draft",
        pending_review: "Pending Review",
        approved: "Approved",
        published: "Published",
        rejected: "Rejected",
    };

    return (
        <span
            className={`inline - flex rounded - full px - 3 py - 1 text - xs font - semibold ${styles[status] || "bg-slate-100 text-slate-700"
                } `}
        >
            {labels[status] || status || "Unknown"}
        </span>
    );
}

export default function MyCourses() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { courses, loading, error } = useSelector(
        (state) => state.myCourses
    );

    const [submittingId, setSubmittingId] = useState(null);
    const [submitError, setSubmitError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        dispatch(fetchMyCourses());
    }, [dispatch]);

    const handleSubmitForReview = async (course) => {
        if (course.status !== "draft") return;

        const confirmed = window.confirm(
            `Submit "${course.title}" for admin review ? `
        );

        if (!confirmed) return;

        setSubmittingId(course.id);
        setSubmitError("");
        setSuccessMessage("");

        try {
            const response = await api.post(
                `/courses/${course.id}/submit`
            );

            setSuccessMessage(
                response.data.message ||
                `"${course.title}" was submitted for review.`
            );

            // Reload courses so the updated status appears.
            await dispatch(fetchMyCourses()).unwrap();
        } catch (error) {
            setSubmitError(
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                "Failed to submit the course for review."
            );
        } finally {
            setSubmittingId(null);
        }
    };

    const handleRefresh = () => {
        setSubmitError("");
        setSuccessMessage("");
        dispatch(fetchMyCourses());
    };

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
                            Mini LMS
                        </p>

                        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                            My Courses
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Create, manage, and submit your courses for review.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => navigate("/instructor/dashboard")}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            Back to dashboard
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate("/instructor/courses/new")}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                            + Create course
                        </button>
                    </div>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold">
                            Your teaching content
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {courses.length}{" "}
                            {courses.length === 1 ? "course" : "courses"} total
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading || submittingId !== null}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                        <RefreshCw
                            size={16}
                            className={loading ? "animate-spin" : ""}
                        />
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4"
                    >
                        <p className="font-semibold text-rose-800">
                            Could not load your courses
                        </p>
                        <p className="mt-1 text-sm text-rose-700">
                            {error}
                        </p>
                    </div>
                )}

                {submitError && (
                    <div
                        role="alert"
                        className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4"
                    >
                        <AlertCircle
                            size={20}
                            className="mt-0.5 shrink-0 text-rose-600"
                        />
                        <div>
                            <p className="font-semibold text-rose-800">
                                Course submission failed
                            </p>
                            <p className="mt-1 text-sm text-rose-700">
                                {submitError}
                            </p>
                        </div>
                    </div>
                )}

                {successMessage && (
                    <div
                        role="status"
                        className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                    >
                        <CheckCircle2
                            size={20}
                            className="mt-0.5 shrink-0 text-emerald-600"
                        />
                        <p className="text-sm font-medium text-emerald-800">
                            {successMessage}
                        </p>
                    </div>
                )}

                {loading && courses.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                        <p className="font-semibold text-slate-700">
                            Loading your courses...
                        </p>
                    </div>
                ) : courses.length === 0 && !error ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <span className="text-2xl">+</span>
                        </div>

                        <h3 className="mt-4 text-lg font-bold">
                            You haven't created any courses yet
                        </h3>

                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                            Create your first course, add modules and lessons,
                            and submit it for admin approval.
                        </p>

                        <button
                            type="button"
                            onClick={() => navigate("/instructor/courses/new")}
                            className="mt-6 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                            Create your first course
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {courses.map((course) => {
                            const isSubmitting =
                                submittingId === course.id;

                            const isDraft = course.status === "draft";

                            return (
                                <article
                                    key={course.id}
                                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                            {course.category || "Uncategorised"}
                                        </span>

                                        <StatusBadge status={course.status} />
                                    </div>

                                    <h3 className="mt-4 text-lg font-bold">
                                        {course.title}
                                    </h3>

                                    <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                                        {course.description ||
                                            "No description provided."}
                                    </p>

                                    {course.rejection_reason && (
                                        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3">
                                            <p className="text-xs font-semibold text-rose-800">
                                                Feedback from admin
                                            </p>
                                            <p className="mt-1 text-sm text-rose-700">
                                                {course.rejection_reason}
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-5 border-t border-slate-100 pt-4">
                                        <p className="text-xs text-slate-500">
                                            Created{" "}
                                            {course.created_at
                                                ? new Date(
                                                    course.created_at
                                                ).toLocaleDateString("en-IN")
                                                : "—"}
                                        </p>


                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate(`/instructor/courses/${course.id}`)
                                            }
                                            className="mt-4 w-full rounded-lg border border-indigo-200 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                                        >
                                            Manage course
                                        </button>
                                        {isDraft && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleSubmitForReview(course)
                                                }
                                                disabled={
                                                    isSubmitting ||
                                                    submittingId !== null
                                                }
                                                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <RefreshCw
                                                            size={16}
                                                            className="animate-spin"
                                                        />
                                                        Submitting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send size={16} />
                                                        Submit for Review
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {course.status === "pending_review" && (
                                            <p className="mt-3 text-center text-xs text-amber-700">
                                                Waiting for admin review.
                                            </p>
                                        )}

                                        {course.status === "approved" && (
                                            <p className="mt-3 text-center text-xs text-blue-700">
                                                Approved by admin.
                                            </p>
                                        )}

                                        {course.status === "published" && (
                                            <p className="mt-3 text-center text-xs text-emerald-700">
                                                Your course is published.
                                            </p>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </main>
    );
}
