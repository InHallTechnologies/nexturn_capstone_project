
export default function StatCard({
    title,
    value,
    description,
    icon: Icon,
    color,
}) {
    return (
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}
            >
                <Icon size={22} />
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500">
                {title}
            </p>

            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                {value ?? 0}
            </p>

            <p className="mt-2 text-xs text-slate-500">
                {description}
            </p>
        </article>
    );
}
