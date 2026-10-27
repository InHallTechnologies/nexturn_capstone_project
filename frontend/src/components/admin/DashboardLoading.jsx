
import { RefreshCw } from "lucide-react";

export default function DashboardLoading() {
    return (
        <div
            role="status"
            className="rounded-xl border border-slate-200 bg-white p-8 text-center"
        >
            <RefreshCw
                size={26}
                className="mx-auto animate-spin text-indigo-600"
            />

            <p className="mt-3 text-sm font-medium text-slate-700">
                Loading dashboard statistics...
            </p>
        </div>
    );
}
