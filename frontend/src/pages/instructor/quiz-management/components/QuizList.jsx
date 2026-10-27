import { buttonClass } from "../quizManagementUtils";

export default function QuizList({
    quizzes,
    quizzesLoading,
    showCreateForm,
    onRefresh,
    onToggleCreateForm,
    onOpenQuiz,
}) {
    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">
                    Existing Quizzes
                </h2>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={quizzesLoading}
                        className={buttonClass}
                    >
                        {quizzesLoading ? "Loading..." : "Refresh"}
                    </button>

                    <button
                        type="button"
                        onClick={onToggleCreateForm}
                        className={buttonClass}
                    >
                        {showCreateForm ? "Cancel" : "+ Create Quiz"}
                    </button>
                </div>
            </div>

            {quizzesLoading ? (
                <p className="text-sm text-gray-500">Loading quizzes...</p>
            ) : quizzes.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
                    No quizzes found for this course. Create your first quiz.
                </div>
            ) : (
                <div className="space-y-3">
                    {quizzes.map((quiz) => (
                        <article
                            key={quiz.id}
                            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-5 shadow-sm"
                        >
                            <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-gray-900">
                                    {quiz.title}
                                </h3>

                                <p className="mt-1 text-sm text-gray-500">
                                    {quiz.question_count ?? 0} questions ·{" "}
                                    {quiz.time_limit_minutes} minutes ·{" "}
                                    {quiz.max_attempts} attempt(s)
                                </p>

                                {quiz.description && (
                                    <p className="mt-2 text-sm text-gray-600">
                                        {quiz.description}
                                    </p>
                                )}

                                <span
                                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs capitalize ${quiz.status === "published"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-700"
                                        }`}
                                >
                                    {quiz.status}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => onOpenQuiz(quiz)}
                                className={buttonClass}
                            >
                                Manage Quiz
                            </button>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}