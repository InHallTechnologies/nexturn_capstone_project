
import StatCard from "./StatCard";

export default function StatisticsGrid({ statistics }) {
    return (
        <section>
            <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-900">
                    Platform statistics
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                    Summary of the current platform data.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {statistics.map((stat) => (
                    <StatCard key={stat.title} {...stat} />
                ))}
            </div>
        </section>
    );
}
