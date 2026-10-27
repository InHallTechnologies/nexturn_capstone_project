import { buttonClass } from "../quizManagementUtils";

export default function QuestionList({
    questions,
    questionsLoading,
    quizIsDraft,
    onRefresh,
    onEdit,
}) {
    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">
                    Questions ({questions.length})
                </h2>

                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={questionsLoading}
                    className={buttonClass}
                >
                    {questionsLoading ? "Loading..." : "Refresh Questions"}
                </button>
            </div>

            {questionsLoading ? (
                <p className="text-sm text-gray-500">Loading questions...</p>
            ) : questions.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
                    No questions added yet.
                </div>
            ) : (
                questions.map((question) => (
                    <article
                        key={question.id}
                        className="rounded-xl border bg-white p-5 shadow-sm"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="font-medium text-gray-900">
                                    {question.order}. {question.question}
                                </p>

                                <p className="mt-1 text-xs uppercase text-gray-500">
                                    {question.type.replace("_", " ")}
                                </p>
                            </div>

                            {quizIsDraft && (
                                <button
                                    type="button"
                                    onClick={() => onEdit(question)}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                >
                                    Edit
                                </button>
                            )}
                        </div>

                        <ul className="mt-3 space-y-2">
                            {question.options.map((option, index) => (
                                <li
                                    key={`${question.id}-${index}`}
                                    className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700"
                                >
                                    {option}
                                </li>
                            ))}
                        </ul>
                    </article>
                ))
            )}
        </section>
    );
}