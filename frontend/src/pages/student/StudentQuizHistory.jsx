
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    ClipboardList,
    LoaderCircle,
    RefreshCw,
    Search,
    XCircle,
} from "lucide-react";

import { fetchStudentQuizHistory } from "../../features/student/studentQuizSlice";

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        });
}

function statusStyle(status) {
    switch ((status || "").toLowerCase()) {
        case "submitted":
        case "completed":
            return "bg-emerald-50 text-emerald-700";
        case "in_progress":
            return "bg-amber-50 text-amber-700";
        case "expired":
            return "bg-red-50 text-red-700";
        default:
            return "bg-slate-100 text-slate-600";
    }
}

function StatusIcon({ status }) {
    const value = (status || "").toLowerCase();

    if (value === "submitted" || value === "completed") {
        return <CheckCircle2 size={15} />;
    }

    if (value === "expired") {
        return <XCircle size={15} />;
    }

    return <Clock3 size={15} />;
}

export default function StudentQuizHistory() {
    const dispatch = useDispatch();
    const { history, historyLoading, historyError } = useSelector(
        (state) => state.studentQuiz
    );

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        dispatch(fetchStudentQuizHistory());
    }, [dispatch]);

    const filteredHistory = useMemo(() => {
        const query = search.trim().toLowerCase();

        return history.filter((item) => {
            const matchesSearch =
                !query ||
                (item.quiz_title || "").toLowerCase().includes(query) ||
                (item.quiz_id || "").toLowerCase().includes(query);

            const status = (item.status || "").toLowerCase();
            const isComplete = ["submitted", "completed"].includes(status);

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "completed" && isComplete) ||
                (statusFilter === "in_progress" && status === "in_progress") ||
                (statusFilter === "expired" && status === "expired");

            return matchesSearch && matchesStatus;
        });
    }, [history, search, statusFilter]);

    const completedAttempts = history.filter((item) =>
        ["submitted", "completed"].includes((item.status || "").toLowerCase())
    );

    const averageScore = completedAttempts.length
        ? completedAttempts.reduce(
            (sum, item) => sum + Number(item.percentage || 0),
            0
        ) / completedAttempts.length
        : 0;

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
            <Link
                to="/student/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600"
            >
                <ArrowLeft size={16} /> Back to dashboard
            </Link>

            <header className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
                    <ClipboardList size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Quiz history</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Review your previous attempts, scores, and results.
                    </p>
                </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">Total attempts</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {history.length}
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">Completed attempts</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-700">
                        {completedAttempts.length}
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">Average score</p>
                    <p className="mt-2 text-3xl font-bold text-indigo-700">
                        {averageScore.toFixed(1)}%
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Search
                        size={17}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search quiz history..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500"
                >
                    <option value="all">All attempts</option>
                    <option value="completed">Completed</option>
                    <option value="in_progress">In progress</option>
                    <option value="expired">Expired</option>
                </select>

                <button
                    onClick={() => dispatch(fetchStudentQuizHistory())}
                    disabled={historyLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {historyLoading && (
                <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
                    <LoaderCircle className="animate-spin" size={22} />
                    Loading quiz history...
                </div>
            )}

            {!historyLoading && historyError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                    <p className="font-semibold">Could not load quiz history</p>
                    <p className="mt-1">{historyError}</p>
                    <p className="mt-2 text-xs">
                        Check that the backend GET /attempts/history endpoint is registered
                        and that your student account is authenticated.
                    </p>
                </div>
            )}

            {!historyLoading && !historyError && filteredHistory.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
                    <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-900">
                        No attempts found
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        {history.length
                            ? "Try changing your search or status filter."
                            : "Your quiz attempts will appear here after you start taking quizzes."}
                    </p>
                    <Link
                        to="/student/courses"
                        className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                        Browse courses
                    </Link>
                </div>
            )}

            {!historyLoading && !historyError && filteredHistory.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="divide-y divide-slate-100">
                        {filteredHistory.map((item) => {
                            const status = (item.status || "").toLowerCase();
                            const complete = ["submitted", "completed"].includes(status);

                            return (
                                <article
                                    key={item.attempt_id}
                                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
                                            <ClipboardList size={21} />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="font-semibold text-slate-900">
                                                {item.quiz_title || "Quiz"}
                                            </h2>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Started: {formatDate(item.started_at)}
                                            </p>
                                            {item.submitted_at && (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Submitted: {formatDate(item.submitted_at)}
                                                </p>
                                            )}
                                            <span
                                                className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(status)}`}
                                            >
                                                <StatusIcon status={status} />
                                                {status.replaceAll("_", " ") || "Unknown"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                                        {complete ? (
                                            <>
                                                <div className="min-w-20">
                                                    <p className="text-xs text-slate-500">Score</p>
                                                    <p className="mt-1 font-bold text-slate-900">
                                                        {item.score ?? 0}/{item.total_questions ?? "—"}
                                                    </p>
                                                </div>
                                                <div className="min-w-20">
                                                    <p className="text-xs text-slate-500">Percentage</p>
                                                    <p className="mt-1 text-lg font-bold text-indigo-700">
                                                        {Number(item.percentage || 0).toFixed(1)}%
                                                    </p>
                                                </div>
                                                <Link
                                                    to={`/student/quiz-attempts/${item.attempt_id}/result`}
                                                    className="rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                                                >
                                                    View result
                                                </Link>
                                            </>
                                        ) : (
                                            <div className="text-sm text-slate-500">
                                                {status === "in_progress"
                                                    ? "Attempt not submitted"
                                                    : "No final score available"}
                                            </div>
                                        )}
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
