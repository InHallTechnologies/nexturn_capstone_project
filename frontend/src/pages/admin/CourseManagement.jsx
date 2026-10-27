
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    BookOpen,
    RefreshCw,
    CheckCircle2,
    XCircle,
    FolderOpen,
    Search,
    Trash2,
    Clock3,
    ShieldCheck,
    FileText,
    Send,
    RotateCcw,
} from "lucide-react";

import {
    fetchCourses,
    approveCourse,
    publishCourse,
    unpublishCourse,
    rejectCourse,
    deleteCourse,
    clearCourseMessages,
} from "../../features/admin/courseManagementSlice";

const STATUS_OPTIONS = [
    { label: "All courses", value: "all" },
    { label: "Pending review", value: "pending_review" },
    { label: "Approved", value: "approved" },
    { label: "Draft", value: "draft" },
    { label: "Published", value: "published" },
];

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function getStatusLabel(status) {
    const labels = {
        pending_review: "Pending review",
        approved: "Approved",
        draft: "Draft",
        published: "Published",
    };

    return labels[status] || status || "Unknown";
}

function getStatusStyle(status) {
    const styles = {
        pending_review: "bg-amber-50 text-amber-700 ring-amber-200",
        approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        draft: "bg-slate-100 text-slate-600 ring-slate-200",
        published: "bg-blue-50 text-blue-700 ring-blue-200",
    };

    return styles[status] || "bg-slate-100 text-slate-600 ring-slate-200";
}

export default function CourseManagement() {
    const dispatch = useDispatch();

    const {
        courses,
        loading,
        processingId,
        error,
        successMessage,
    } = useSelector((state) => state.courseManagement);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("all");

    useEffect(() => {
        dispatch(fetchCourses());

        return () => {
            dispatch(clearCourseMessages());
        };
    }, [dispatch]);

    const filteredCourses = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();

        return courses.filter((course) => {
            const matchesStatus =
                selectedStatus === "all" ||
                course.status === selectedStatus;

            const matchesSearch =
                !search ||
                course.title?.toLowerCase().includes(search) ||
                course.description?.toLowerCase().includes(search) ||
                course.category?.toLowerCase().includes(search) ||
                course.instructor_id?.toLowerCase().includes(search);

            return matchesStatus && matchesSearch;
        });
    }, [courses, searchTerm, selectedStatus]);

    const pendingCount = courses.filter(
        (course) => course.status === "pending_review"
    ).length;

    const approvedCount = courses.filter(
        (course) => course.status === "approved"
    ).length;

    const draftCount = courses.filter(
        (course) => course.status === "draft"
    ).length;

    const publishedCount = courses.filter(
        (course) => course.status === "published"
    ).length;

    const handleApprove = async (course) => {
        if (course.status !== "pending_review") return;

        const confirmed = window.confirm(
            `Approve "${course.title}"?`
        );

        if (!confirmed) return;

        await dispatch(approveCourse(course.id));
    };

    const handlePublish = async (course) => {
        if (course.status !== "approved") return;

        const confirmed = window.confirm(
            `Publish "${course.title}" so students can access it?`
        );

        if (!confirmed) return;

        await dispatch(publishCourse(course.id));
    };

    const handleUnpublish = async (course) => {
        if (course.status !== "published") return;

        const confirmed = window.confirm(
            `Unpublish "${course.title}" and move it back to draft?`
        );

        if (!confirmed) return;

        await dispatch(unpublishCourse(course.id));
    };

    const handleReject = async (course) => {
        if (course.status !== "pending_review") return;

        const reason = window.prompt(
            `Enter the reason for rejecting "${course.title}":`
        );

        if (reason === null) return;

        if (!reason.trim()) {
            window.alert("Please enter a rejection reason.");
            return;
        }

        if (reason.trim().length > 1000) {
            window.alert(
                "The rejection reason must not exceed 1000 characters."
            );
            return;
        }

        await dispatch(
            rejectCourse({
                courseId: course.id,
                reason: reason.trim(),
            })
        );
    };

    const handleDelete = async (course) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${course.title}"? This action cannot be undone.`
        );

        if (!confirmed) return;

        await dispatch(deleteCourse(course.id));
    };

    const handleRefresh = () => {
        dispatch(clearCourseMessages());
        dispatch(fetchCourses());
    };

    const handleFilterChange = (status) => {
        setSelectedStatus(status);
        dispatch(clearCourseMessages());
    };

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">
            {/* Page heading */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                        <BookOpen size={23} />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Course Management
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Review, approve, publish, and manage instructor courses.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCw
                        size={16}
                        className={loading ? "animate-spin" : ""}
                    />
                    Refresh
                </button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Total Courses"
                    value={courses.length}
                    icon={<BookOpen size={21} />}
                    iconStyle="bg-indigo-100 text-indigo-700"
                />

                <StatCard
                    title="Pending Review"
                    value={pendingCount}
                    icon={<Clock3 size={21} />}
                    iconStyle="bg-amber-100 text-amber-700"
                />

                <StatCard
                    title="Approved"
                    value={approvedCount}
                    icon={<ShieldCheck size={21} />}
                    iconStyle="bg-emerald-100 text-emerald-700"
                />

                <StatCard
                    title="Published"
                    value={publishedCount}
                    icon={<Send size={21} />}
                    iconStyle="bg-blue-100 text-blue-700"
                />
            </div>

            {/* Messages */}
            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    <XCircle size={19} className="mt-0.5 shrink-0" />

                    <div className="min-w-0 flex-1">
                        <p className="font-semibold">Something went wrong</p>
                        <p className="mt-1 break-words">{error}</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => dispatch(clearCourseMessages())}
                        className="text-red-600 hover:text-red-800"
                        aria-label="Dismiss error"
                    >
                        <XCircle size={18} />
                    </button>
                </div>
            )}

            {successMessage && (
                <div
                    role="status"
                    className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
                >
                    <CheckCircle2 size={19} className="mt-0.5 shrink-0" />

                    <div className="min-w-0 flex-1">
                        <p className="font-semibold">{successMessage}</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => dispatch(clearCourseMessages())}
                        className="text-emerald-700 hover:text-emerald-900"
                        aria-label="Dismiss success message"
                    >
                        <XCircle size={18} />
                    </button>
                </div>
            )}

            {/* Search and filters */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:max-w-md">
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(event.target.value)
                            }
                            placeholder="Search by title, category, or instructor ID..."
                            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                    handleFilterChange(option.value)
                                }
                                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${selectedStatus === option.value
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Course list */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-semibold text-slate-900">
                            Courses
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {filteredCourses.length}{" "}
                            {filteredCourses.length === 1
                                ? "course"
                                : "courses"}{" "}
                            found
                        </p>
                    </div>

                    <span className="text-xs text-slate-500">
                        {pendingCount} awaiting review · {draftCount} drafts
                    </span>
                </div>

                {loading ? (
                    <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8">
                        <RefreshCw
                            size={28}
                            className="animate-spin text-indigo-600"
                        />

                        <p className="text-sm text-slate-500">
                            Loading courses...
                        </p>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <FolderOpen size={27} />
                        </div>

                        <h3 className="mt-4 font-semibold text-slate-800">
                            No courses found
                        </h3>

                        <p className="mt-1 max-w-sm text-sm text-slate-500">
                            {searchTerm || selectedStatus !== "all"
                                ? "Try changing your search or status filter."
                                : "Courses submitted by instructors will appear here."}
                        </p>

                        {(searchTerm || selectedStatus !== "all") && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm("");
                                    setSelectedStatus("all");
                                }}
                                className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredCourses.map((course) => {
                            const isProcessing =
                                processingId === course.id;
                            const isPending =
                                course.status === "pending_review";
                            const isApproved =
                                course.status === "approved";
                            const isPublished =
                                course.status === "published";

                            return (
                                <article
                                    key={course.id}
                                    className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 lg:flex-row lg:items-center lg:justify-between"
                                >
                                    {/* Course details */}
                                    <div className="flex min-w-0 flex-1 gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                            <BookOpen size={23} />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="break-words font-semibold text-slate-900">
                                                    {course.title ||
                                                        "Untitled course"}
                                                </h3>

                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusStyle(
                                                        course.status
                                                    )}`}
                                                >
                                                    {getStatusLabel(
                                                        course.status
                                                    )}
                                                </span>
                                            </div>

                                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                                                {course.description ||
                                                    "No description provided."}
                                            </p>

                                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                                                <span>
                                                    Category:{" "}
                                                    <span className="font-medium text-slate-700">
                                                        {course.category ||
                                                            "Uncategorized"}
                                                    </span>
                                                </span>

                                                <span>
                                                    Instructor:{" "}
                                                    <span className="font-medium text-slate-700">
                                                        {course.instructor_id ||
                                                            "—"}
                                                    </span>
                                                </span>

                                                <span>
                                                    Created:{" "}
                                                    <span className="font-medium text-slate-700">
                                                        {formatDate(
                                                            course.created_at
                                                        )}
                                                    </span>
                                                </span>
                                            </div>

                                            {course.rejection_reason && (
                                                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                                    <span className="font-semibold">
                                                        Previous rejection
                                                        reason:{" "}
                                                    </span>
                                                    {course.rejection_reason}
                                                </div>
                                            )}

                                            {isApproved && (
                                                <p className="mt-3 text-sm text-emerald-700">
                                                    Approved. Publish this
                                                    course when it is ready
                                                    for students.
                                                </p>
                                            )}

                                            {isPublished && (
                                                <p className="mt-3 text-sm text-blue-700">
                                                    Published and ready for
                                                    students, subject to your
                                                    student catalogue API.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                                        {isPending && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleApprove(course)
                                                    }
                                                    disabled={isProcessing}
                                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <CheckCircle2 size={16} />
                                                    Approve
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleReject(course)
                                                    }
                                                    disabled={isProcessing}
                                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <XCircle size={16} />
                                                    Reject
                                                </button>
                                            </>
                                        )}

                                        {isApproved && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handlePublish(course)
                                                }
                                                disabled={isProcessing}
                                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <Send size={16} />
                                                Publish
                                            </button>
                                        )}

                                        {isPublished && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleUnpublish(course)
                                                }
                                                disabled={isProcessing}
                                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-white px-3.5 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <RotateCcw size={16} />
                                                Unpublish
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDelete(course)
                                            }
                                            disabled={isProcessing}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Trash2 size={16} />
                                            Delete
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}

function StatCard({ title, value, icon, iconStyle }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        {title}
                    </p>

                    <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                        {value}
                    </p>
                </div>

                <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconStyle}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}
