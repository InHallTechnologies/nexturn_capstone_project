import { buttonClass, inputClass } from "../quizManagementUtils";

export default function CreateQuizForm({
    quizForm,
    setQuizForm,
    loading,
    onSubmit,
}) {
    function updateField(field, value) {
        setQuizForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    return (
        <form
            onSubmit={onSubmit}
            className="space-y-5 rounded-xl border bg-white p-6 shadow-sm"
        >
            <h2 className="text-lg font-semibold">Create a Quiz</h2>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Quiz title
                </label>

                <input
                    required
                    maxLength={150}
                    value={quizForm.title}
                    onChange={(event) =>
                        updateField("title", event.target.value)
                    }
                    className={inputClass}
                    placeholder="e.g. JavaScript Fundamentals"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Description
                </label>

                <textarea
                    maxLength={2000}
                    value={quizForm.description}
                    onChange={(event) =>
                        updateField("description", event.target.value)
                    }
                    className={inputClass}
                    rows={3}
                    placeholder="Describe this quiz"
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-sm font-medium">
                        Time limit (minutes)
                    </label>

                    <input
                        required
                        type="number"
                        min="1"
                        step="1"
                        value={quizForm.time_limit_minutes}
                        onChange={(event) =>
                            updateField("time_limit_minutes", event.target.value)
                        }
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">
                        Maximum attempts
                    </label>

                    <input
                        required
                        type="number"
                        min="1"
                        step="1"
                        value={quizForm.max_attempts}
                        onChange={(event) =>
                            updateField("max_attempts", event.target.value)
                        }
                        className={inputClass}
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className={buttonClass}
            >
                {loading ? "Creating..." : "Create Quiz"}
            </button>
        </form>
    );
}