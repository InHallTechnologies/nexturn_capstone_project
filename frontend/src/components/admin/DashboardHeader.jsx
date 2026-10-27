
import { RefreshCw } from "lucide-react";

export default function DashboardHeader({ onRefresh, loading }) {
    return (
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
                <p className="text-sm font-medium text-indigo-600">
                    Overview
                </p>

                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Admin Dashboard
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                    Monitor users, courses, enrollments, and assessments.
                </p>
            </div>

            <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
            >
                <RefreshCw
                    size={16}
                    className={loading ? "animate-spin" : ""}
                />
                Refresh statistics
            </button>
        </header>
    );
}
