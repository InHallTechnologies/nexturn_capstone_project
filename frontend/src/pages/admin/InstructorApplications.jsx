
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    UsersRound,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock3,
    Mail,
    Search,
    Trash2,
} from "lucide-react";

import {
    fetchInstructors,
    approveInstructor,
    rejectInstructor,
    deleteInstructor,
    clearApplicationMessages,
} from "../../features/admin/instructorApplicationsSlice";

const statusOptions = [
    { label: "All statuses", value: "" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
];

function formatDate(date) {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Date unavailable";
    }

    return parsedDate.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function statusStyle(status) {
    const styles = {
        pending: "bg-amber-50 text-amber-700",
        approved: "bg-green-50 text-green-700",
        rejected: "bg-red-50 text-red-700",
    };

    return styles[status] || "bg-gray-100 text-gray-700";
}

export default function InstructorApplications() {
    const dispatch = useDispatch();

    const {
        instructors,
        loading,
        processingId,
        error,
        successMessage,
    } = useSelector((state) => state.instructorApplications);

    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        dispatch(fetchInstructors(status));
    }, [dispatch, status]);

    useEffect(() => {
        return () => {
            dispatch(clearApplicationMessages());
        };
    }, [dispatch]);

    const filteredInstructors = useMemo(() => {
        const query = search.trim().toLowerCase();

        return instructors.filter((instructor) => {
            return (
                !query ||
                instructor.name?.toLowerCase().includes(query) ||
                instructor.email?.toLowerCase().includes(query)
            );
        });
    }, [instructors, search]);

    function handleApprove(instructor) {
        if (instructor.instructor_status !== "pending") return;

        const confirmed = window.confirm(
            `Are you sure you want to approve ${instructor.name}?`
        );

        if (confirmed) {
            dispatch(approveInstructor(instructor.id));
        }
    }

    function handleReject(instructor) {
        if (instructor.instructor_status !== "pending") return;

        const confirmed = window.confirm(
            `Are you sure you want to reject ${instructor.name}?`
        );

        if (confirmed) {
            dispatch(rejectInstructor(instructor.id));
        }
    }

    function handleDelete(instructor) {
        const confirmed = window.confirm(
            `Remove instructor ${instructor.name || instructor.email}? ` +
            "This cannot be undone."
        );

        if (confirmed) {
            dispatch(deleteInstructor(instructor.id));
        }
    }

    function handleRefresh() {
        dispatch(fetchInstructors(status));
    }

    const pendingCount = instructors.filter(
        (instructor) => instructor.instructor_status === "pending"
    ).length;

    const approvedCount = instructors.filter(
        (instructor) => instructor.instructor_status === "approved"
    ).length;

    const rejectedCount = instructors.filter(
        (instructor) => instructor.instructor_status === "rejected"
    ).length;

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <p className="text-sm font-medium text-indigo-600">
                        Administration
                    </p>

                    <h1 className="mt-1 text-2xl font-bold text-gray-900">
                        Instructor Management
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        View all instructors and manage their application status.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                    <RefreshCw
                        size={16}
                        className={loading ? "animate-spin" : ""}
                    />
                    Refresh
                </button>
            </div>

            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Pending</p>
                    <p className="mt-1 text-2xl font-bold text-amber-600">
                        {pendingCount}
                    </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Approved</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">
                        {approvedCount}
                    </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Rejected</p>
                    <p className="mt-1 text-2xl font-bold text-red-600">
                        {rejectedCount}
                    </p>
                </div>
            </div>

            {/* Search and status filter */}
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row">
                <div className="relative flex-1">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search instructor name or email..."
                        className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                </div>

                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
                >
                    {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Success */}
            {successMessage && (
                <div
                    role="status"
                    className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
                >
                    {successMessage}
                </div>
            )}

            {/* Error */}
            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    <p>{error}</p>

                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="mt-2 font-semibold underline"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* Loading */}
            {loading && instructors.length === 0 && (
                <div className="flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white p-12 text-gray-500">
                    <RefreshCw size={20} className="animate-spin" />
                    Loading instructors...
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && filteredInstructors.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
                    <UsersRound
                        size={40}
                        className="mx-auto text-gray-400"
                    />

                    <h2 className="mt-4 text-lg font-semibold text-gray-900">
                        No instructors found
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                        Try changing the status filter or search term.
                    </p>
                </div>
            )}

            {/* Instructor list */}
            {filteredInstructors.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 px-5 py-4">
                        <h2 className="font-semibold text-gray-900">
                            Instructors ({filteredInstructors.length})
                        </h2>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {filteredInstructors.map((instructor) => {
                            const isProcessing =
                                processingId === instructor.id;

                            const instructorStatus =
                                instructor.instructor_status || "pending";

                            const profileText =
                                typeof instructor.profile === "string"
                                    ? instructor.profile
                                    : instructor.profile?.bio ||
                                    instructor.profile?.headline ||
                                    "";

                            return (
                                <article
                                    key={instructor.id}
                                    className="p-5 transition hover:bg-gray-50/70"
                                >
                                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="flex min-w-0 items-start gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-lg font-bold text-indigo-600">
                                                {instructor.name
                                                    ?.charAt(0)
                                                    ?.toUpperCase() || "I"}
                                            </div>

                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-gray-900">
                                                    {instructor.name ||
                                                        "Unnamed instructor"}
                                                </h3>

                                                <p className="mt-1 flex items-center gap-2 break-all text-sm text-gray-500">
                                                    <Mail
                                                        size={15}
                                                        className="shrink-0"
                                                    />
                                                    {instructor.email}
                                                </p>

                                                {profileText && (
                                                    <p className="mt-2 text-sm leading-6 text-gray-600">
                                                        {profileText}
                                                    </p>
                                                )}

                                                <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                                                    <Clock3 size={13} />
                                                    Joined{" "}
                                                    {formatDate(
                                                        instructor.created_at
                                                    )}
                                                </p>

                                                <span
                                                    className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyle(instructorStatus)}`}
                                                >
                                                    {instructorStatus}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 lg:justify-end">
                                            {instructorStatus === "pending" && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleApprove(instructor)
                                                        }
                                                        disabled={Boolean(processingId)}
                                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                        {isProcessing
                                                            ? "Processing..."
                                                            : "Approve"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleReject(instructor)
                                                        }
                                                        disabled={Boolean(processingId)}
                                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                    >
                                                        <XCircle size={16} />
                                                        Reject
                                                    </button>
                                                </>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDelete(instructor)
                                                }
                                                disabled={Boolean(processingId)}
                                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                <Trash2 size={16} />
                                                {isProcessing
                                                    ? "Processing..."
                                                    : "Remove"}
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
