
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchMyCourses } from "../../features/instructor/myCoursesSlice";

export default function StudentPerformanceCourses() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { courses, loading, error } = useSelector(
        (state) => state.myCourses
    );

    useEffect(() => {
        dispatch(fetchMyCourses());
    }, [dispatch]);

    return (
        <main className="mx-auto max-w-7xl p-6">
            <h1 className="text-3xl font-bold text-slate-900">
                Student Performance
            </h1>

            <p className="mt-2 text-slate-500">
                Select a course to view its enrolled students and their progress.
            </p>

            {loading && (
                <p className="mt-6 text-slate-600">Loading courses...</p>
            )}

            {error && (
                <p role="alert" className="mt-6 text-red-600">
                    {error}
                </p>
            )}

            {!loading && !error && courses.length === 0 && (
                <p className="mt-6 rounded-xl border bg-white p-6 text-slate-600">
                    You haven't created any courses yet.
                </p>
            )}


            <div className="mt-8 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                    <article
                        key={course.id}
                        className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <h2 className="text-lg font-bold leading-7 text-slate-900">
                                {course.title}
                            </h2>

                            <span
                                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${{
                                    draft: "bg-slate-100 text-slate-700",
                                    pending_review: "bg-amber-100 text-amber-700",
                                    approved: "bg-blue-100 text-blue-700",
                                    published: "bg-emerald-100 text-emerald-700",
                                    rejected: "bg-rose-100 text-rose-700",
                                }[course.status] || "bg-indigo-50 text-indigo-700"
                                    }`}
                            >
                                {course.status?.replaceAll("_", " ") || "Unknown"}
                            </span>
                        </div>

                        <p className="mt-3 min-h-[5rem] text-sm leading-6 text-slate-500">
                            {course.description || "No description available."}
                        </p>
                        <div className="mt-auto border-t border-slate-100 pt-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Course
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-700">
                                {course.title}
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate(`/instructor/courses/${course.id}/students`)
                                }
                                className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                View enrolled students
                                <span aria-hidden="true" className="ml-2">→</span>
                            </button>
                        </div>
                    </article>
                ))}
            </div>

        </main>
    );
}
