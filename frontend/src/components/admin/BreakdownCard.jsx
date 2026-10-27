
export default function BreakdownCard({
    title,
    icon: Icon,
    items,
}) {
    return (
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon size={21} />
                </div>

                <h3 className="font-semibold text-slate-900">
                    {title}
                </h3>
            </div>

            <div className="divide-y divide-slate-100">
                {items.map((item) => (
                    <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                        <span className="text-sm text-slate-600">
                            {item.label}
                        </span>

                        <span className="text-sm font-semibold tabular-nums text-slate-900">
                            {item.value ?? 0}
                        </span>
                    </div>
                ))}
            </div>
        </article>
    );
}
