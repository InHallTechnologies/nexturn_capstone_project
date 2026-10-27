
import { Construction } from "lucide-react";

export default function AdminPlaceholder({ title, description }) {
    return (
        <section className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Construction size={27} />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
                {title}
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                {description}
            </p>

            <span className="mt-5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Coming next
            </span>
        </section>
    );
}
