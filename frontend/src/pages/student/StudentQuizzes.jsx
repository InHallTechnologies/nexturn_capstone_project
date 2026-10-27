
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import {
    ArrowLeft,
    ClipboardList,
    Clock3,
    LoaderCircle,
    PlayCircle,
    RefreshCw,
} from "lucide-react";

import { fetchCourseQuizzes } from "../../features/student/studentQuizSlice";

export default function StudentQuizzes() {
    const { courseId } = useParams();
    const dispatch = useDispatch();

    const { quizzesByCourse, loading, error } = useSelector(
        (state) => state.studentQuiz
    );

    const quizzes = quizzesByCourse[courseId] || [];

    useEffect(() => {
        dispatch(fetchCourseQuizzes(courseId));
    }, [dispatch, courseId]);

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
            <Link
                to={`/student/courses/${courseId}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600"
            >
                <ArrowLeft size={16} />
                Back to course
            </Link>

            <header>
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
                        <ClipboardList size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Course quizzes
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Review your quizzes and test what you've learned.
                        </p>
                    </div>
                </div>
            </header>

            {loading && (
                <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
                    <LoaderCircle className="animate-spin" size={24} />
                    Loading quizzes...
                </div>
            )}

            {!loading && error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                    <p className="font-semibold text-red-800">
                        Could not load quizzes
                    </p>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                    <button
                        onClick={() => dispatch(fetchCourseQuizzes(courseId))}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                    >
                        <RefreshCw size={15} /> Try again
                    </button>
                </div>
            )}

            {!loading && !error && quizzes.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
                    <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-900">
                        No quizzes available yet
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                        Published quizzes for this course will appear here when your
                        instructor makes them available.
                    </p>
                </div>
            )}

            {!loading && !error && quizzes.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                    {quizzes.map((quiz) => (
                        <article
                            key={quiz.id}
                            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                        >
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                                    <ClipboardList size={22} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        {quiz.title}
                                    </h2>
                                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                        {quiz.description || "Test your understanding of this course."}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-3">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
                                    <Clock3 size={14} />
                                    {quiz.time_limit_minutes} minutes
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                                    <RefreshCw size={14} />
                                    {quiz.max_attempts} attempt
                                    {quiz.max_attempts === 1 ? "" : "s"} maximum
                                </span>
                            </div>

                            <div className="mt-6 border-t border-slate-100 pt-4">
                                <Link
                                    to={`/student/quizzes/${quiz.id}`}
                                    state={{ courseId }}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                                >
                                    <PlayCircle size={17} />
                                    Start quiz
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
