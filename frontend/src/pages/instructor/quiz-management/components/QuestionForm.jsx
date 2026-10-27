import { buttonClass, inputClass } from "../quizManagementUtils";

export default function QuestionForm({
    questionForm,
    setQuestionForm,
    editingQuestionId,
    loading,
    onSubmit,
    onCancelEdit,
    onOptionChange,
    onQuestionTypeChange,
    onToggleCorrectAnswer,
}) {
    function updateField(field, value) {
        setQuestionForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    function removeOption(index) {
        setQuestionForm((previous) => {
            const removedOption = previous.options[index];

            return {
                ...previous,
                options: previous.options.filter(
                    (_, optionIndex) => optionIndex !== index
                ),
                correct_answers: previous.correct_answers.filter(
                    (answer) => answer !== removedOption
                ),
            };
        });
    }

    function addOption() {
        setQuestionForm((previous) => ({
            ...previous,
            options: [...previous.options, ""],
        }));
    }

    return (
        <form
            onSubmit={onSubmit}
            className="space-y-5 rounded-xl border bg-white p-6 shadow-sm"
        >
            <h2 className="text-lg font-semibold">
                {editingQuestionId ? "Edit Question" : "Add Question"}
            </h2>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Question
                </label>

                <textarea
                    required
                    maxLength={2000}
                    value={questionForm.question}
                    onChange={(event) =>
                        updateField("question", event.target.value)
                    }
                    className={inputClass}
                    rows={3}
                    placeholder="Enter your question"
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-sm font-medium">
                        Question type
                    </label>

                    <select
                        value={questionForm.type}
                        onChange={onQuestionTypeChange}
                        className={inputClass}
                    >
                        <option value="mcq">Multiple choice</option>
                        <option value="multi_select">Multiple select</option>
                        <option value="true_false">True / False</option>
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">
                        Question order
                    </label>

                    <input
                        required
                        type="number"
                        min="1"
                        step="1"
                        value={questionForm.order}
                        onChange={(event) =>
                            updateField("order", event.target.value)
                        }
                        className={inputClass}
                    />
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-sm font-medium">
                    Options — select the correct{" "}
                    {questionForm.type === "multi_select" ? "answers" : "answer"}
                </p>

                {questionForm.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <input
                            type={
                                questionForm.type === "multi_select"
                                    ? "checkbox"
                                    : "radio"
                            }
                            name="correct-answer"
                            aria-label={`Mark option ${index + 1} as correct`}
                            checked={questionForm.correct_answers.includes(option)}
                            disabled={!option.trim()}
                            onChange={() => onToggleCorrectAnswer(option)}
                            className="h-4 w-4 accent-blue-600"
                        />

                        <input
                            required
                            disabled={questionForm.type === "true_false"}
                            value={option}
                            onChange={(event) =>
                                onOptionChange(index, event.target.value)
                            }
                            className={`${inputClass} disabled:bg-gray-100`}
                            placeholder={`Option ${index + 1}`}
                        />

                        {questionForm.type !== "true_false" &&
                            questionForm.options.length > 2 && (
                                <button
                                    type="button"
                                    onClick={() => removeOption(index)}
                                    className="text-sm font-medium text-red-600"
                                >
                                    Remove
                                </button>
                            )}
                    </div>
                ))}

                {questionForm.type !== "true_false" && (
                    <button
                        type="button"
                        onClick={addOption}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                        + Add option
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-3">
                <button
                    type="submit"
                    disabled={loading}
                    className={buttonClass}
                >
                    {loading
                        ? "Saving..."
                        : editingQuestionId
                            ? "Save Changes"
                            : "Add Question"}
                </button>

                {editingQuestionId && (
                    <button
                        type="button"
                        disabled={loading}
                        onClick={onCancelEdit}
                        className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}