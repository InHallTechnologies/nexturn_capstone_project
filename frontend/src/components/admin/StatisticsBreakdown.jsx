
import BreakdownCard from "./BreakdownCard";

export default function StatisticsBreakdown({ sections }) {
    if (!sections.length) return null;

    return (
        <section>
            <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-900">
                    Detailed breakdown
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                    Status counts across all major LMS modules.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sections.map((section) => (
                    <BreakdownCard
                        key={section.title}
                        {...section}
                    />
                ))}
            </div>
        </section>
    );
}
