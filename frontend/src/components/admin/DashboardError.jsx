
import { RefreshCw, XCircle } from "lucide-react";

export default function DashboardError({ message, onRetry, loading }) {
    return (
        <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
            <div className="flex items-start gap-3">
                <XCircle
                    size={20}
                    className="mt-0.5 shrink-0 text-red-600"
                />

                <div>
                    <p className="font-semibold text-red-800">
                        Unable to load statistics
                    </p>

                    <p className="mt-1 text-sm text-red-700">
                        {message}
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={onRetry}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
                <RefreshCw
                    size={15}
                    className={loading ? "animate-spin" : ""}
                />
                Try again
            </button>
        </div>
    );
}
