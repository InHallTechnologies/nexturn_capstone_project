import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../../services/api";

import QuizList from "./components/QuizList";
import CreateQuizForm from "./components/CreateQuizForm";
import QuestionForm from "./components/QuestionForm";
import QuestionList from "./components/QuestionList";

import {
    buttonClass,
    createEmptyQuiz,
    createEmptyQuestion,
    getErrorMessage,
} from "./quizManagementUtils";

export default function QuizManagement() {
    const { courseId } = useParams();

    const [course, setCourse] = useState(null);
    const [quizzes, setQuizzes] = useState([]);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [questions, setQuestions] = useState([]);

    const [quizForm, setQuizForm] = useState(createEmptyQuiz);
    const [questionForm, setQuestionForm] = useState(
        createEmptyQuestion()
    );

    const [editingQuestionId, setEditingQuestionId] = useState(null);
    const [courseLoading, setCourseLoading] = useState(true);
    const [quizzesLoading, setQuizzesLoading] = useState(true);
    const [questionsLoading, setQuestionsLoading] = useState(false);
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [showCreateForm, setShowCreateForm] = useState(false);

    const courseIsPublished = course?.status === "published";
    const quizIsDraft = selectedQuiz?.status === "draft";

    function clearNotifications() {
        setError("");
        setMessage("");
    }

    // Load course details.
    const loadCourse = useCallback(async () => {
        setCourseLoading(true);

        try {
            const response = await api.get(`/courses/${courseId}`);
            const data = response.data;

            setCourse(data.course ?? data);
        } catch (err) {
            setCourse(null);
            setError(getErrorMessage(err, "Failed to load course."));
        } finally {
            setCourseLoading(false);
        }
    }, [courseId]);

    // Load all quizzes belonging to this course.
    const loadQuizzes = useCallback(async () => {
        setQuizzesLoading(true);

        try {
            const response = await api.get(
                `/courses/${courseId}/instructor-quizzes`
            );

            setQuizzes(response.data.quizzes ?? []);
        } catch (err) {
            setError(
                getErrorMessage(err, "Failed to load existing quizzes.")
            );
        } finally {
            setQuizzesLoading(false);
        }
    }, [courseId]);

    // Load questions for the selected quiz.
    const loadQuestions = useCallback(async (quizId) => {
        setQuestionsLoading(true);

        try {
            const response = await api.get(
                `/quizzes/${quizId}/questions`
            );

            setQuestions(response.data.questions ?? []);
        } catch (err) {
            setQuestions([]);
            setError(
                getErrorMessage(err, "Failed to load quiz questions.")
            );
        } finally {
            setQuestionsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCourse();
        loadQuizzes();
    }, [loadCourse, loadQuizzes]);

    useEffect(() => {
        if (selectedQuiz?.id) {
            loadQuestions(selectedQuiz.id);
        } else {
            setQuestions([]);
        }
    }, [selectedQuiz?.id, loadQuestions]);

    // Create quiz.
    async function handleCreateQuiz(event) {
        event.preventDefault();
        clearNotifications();

        const timeLimit = Number(quizForm.time_limit_minutes);
        const maxAttempts = Number(quizForm.max_attempts);

        if (!quizForm.title.trim()) {
            setError("Quiz title is required.");
            return;
        }

        if (!Number.isInteger(timeLimit) || timeLimit <= 0) {
            setError("Time limit must be a positive whole number.");
            return;
        }

        if (!Number.isInteger(maxAttempts) || maxAttempts <= 0) {
            setError("Maximum attempts must be a positive whole number.");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post(
                `/courses/${courseId}/quizzes`,
                {
                    title: quizForm.title.trim(),
                    description: quizForm.description.trim(),
                    time_limit_minutes: timeLimit,
                    max_attempts: maxAttempts,
                }
            );

            const createdQuiz = {
                ...response.data.quiz,
                question_count: 0,
            };

            setQuizzes((previous) => [
                createdQuiz,
                ...previous.filter((item) => item.id !== createdQuiz.id),
            ]);

            setSelectedQuiz(createdQuiz);
            setQuizForm(createEmptyQuiz());
            setShowCreateForm(false);
            setMessage("Quiz created successfully.");
        } catch (err) {
            setError(getErrorMessage(err, "Failed to create quiz."));
        } finally {
            setLoading(false);
        }
    }

    // Update question type and reset incompatible answers.
    function handleQuestionTypeChange(event) {
        const type = event.target.value;

        setQuestionForm((previous) => ({
            ...previous,
            type,
            options:
                type === "true_false"
                    ? ["True", "False"]
                    : previous.type === "true_false"
                        ? ["", "", "", ""]
                        : previous.options,
            correct_answers: [],
        }));
    }

    // Update an option and remove an answer that no longer matches.
    function handleOptionChange(index, value) {
        setQuestionForm((previous) => {
            const options = [...previous.options];
            const oldOption = options[index];

            options[index] = value;

            return {
                ...previous,
                options,
                correct_answers: previous.correct_answers.filter(
                    (answer) => answer !== oldOption
                ),
            };
        });
    }

    // Support single-choice and multiple-select answers.
    function toggleCorrectAnswer(option) {
        if (!option.trim()) return;

        setQuestionForm((previous) => {
            const selected = previous.correct_answers.includes(option);

            if (previous.type === "multi_select") {
                return {
                    ...previous,
                    correct_answers: selected
                        ? previous.correct_answers.filter(
                            (answer) => answer !== option
                        )
                        : [...previous.correct_answers, option],
                };
            }

            return {
                ...previous,
                correct_answers: selected ? [] : [option],
            };
        });
    }

    function resetQuestionForm() {
        setEditingQuestionId(null);
        setQuestionForm(createEmptyQuestion(questions.length + 1));
    }

    // Validate and save a new or existing question.
    async function handleSaveQuestion(event) {
        event.preventDefault();
        clearNotifications();

        if (!selectedQuiz?.id || !quizIsDraft) {
            setError("Only draft quizzes can be edited.");
            return;
        }

        const options = questionForm.options.map((item) => item.trim());

        if (!questionForm.question.trim()) {
            setError("Question text is required.");
            return;
        }

        if (options.some((item) => !item)) {
            setError("Please fill in every option.");
            return;
        }

        if (new Set(options).size !== options.length) {
            setError("Options must not contain duplicates.");
            return;
        }

        if (options.length < 2) {
            setError("At least two options are required.");
            return;
        }

        if (
            questionForm.type === "true_false" &&
            (options.length !== 2 ||
                !options.includes("True") ||
                !options.includes("False"))
        ) {
            setError("True/False questions require True and False options.");
            return;
        }

        if (
            !Number.isInteger(Number(questionForm.order)) ||
            Number(questionForm.order) <= 0
        ) {
            setError("Question order must be a positive whole number.");
            return;
        }

        const correctAnswers = questionForm.correct_answers;

        if (
            correctAnswers.length === 0 ||
            !correctAnswers.every((answer) => options.includes(answer))
        ) {
            setError("Select a valid correct answer.");
            return;
        }

        if (
            questionForm.type === "multi_select" &&
            correctAnswers.length < 2
        ) {
            setError("Select at least two correct answers.");
            return;
        }

        if (
            questionForm.type !== "multi_select" &&
            correctAnswers.length !== 1
        ) {
            setError("Select exactly one correct answer.");
            return;
        }

        const payload = {
            question: questionForm.question.trim(),
            type: questionForm.type,
            options,
            correct_answers: correctAnswers,
            order: Number(questionForm.order),
        };

        setLoading(true);

        try {
            if (editingQuestionId) {
                await api.patch(
                    `/quizzes/${selectedQuiz.id}/questions/${editingQuestionId}`,
                    payload
                );

                setMessage("Question updated successfully.");
            } else {
                await api.post(
                    `/quizzes/${selectedQuiz.id}/questions`,
                    payload
                );

                setMessage("Question added successfully.");
            }

            await loadQuestions(selectedQuiz.id);
            await loadQuizzes();

            resetQuestionForm();
        } catch (err) {
            setError(getErrorMessage(err, "Failed to save question."));
        } finally {
            setLoading(false);
        }
    }

    // Load an existing question into the form.
    function startEditing(question) {
        clearNotifications();

        if (!Array.isArray(question.correct_answers)) {
            setError(
                "The questions endpoint must return correct_answers to edit this question."
            );
            return;
        }

        setEditingQuestionId(question.id);

        setQuestionForm({
            question: question.question,
            type: question.type,
            options: [...question.options],
            correct_answers: [...question.correct_answers],
            order: question.order,
        });
    }

    // Publish the selected quiz.
    async function handlePublish() {
        clearNotifications();

        if (!selectedQuiz?.id || !quizIsDraft) {
            setError("Only draft quizzes can be published.");
            return;
        }

        if (!courseIsPublished) {
            setError("Publish the course before publishing its quizzes.");
            return;
        }

        if (questions.length === 0) {
            setError("Add at least one question before publishing.");
            return;
        }

        if (
            !window.confirm(
                "Are you sure you want to publish this quiz?"
            )
        ) {
            return;
        }

        setLoading(true);

        try {
            const response = await api.patch(
                `/courses/${selectedQuiz.id}/publish`
            );

            setSelectedQuiz((previous) => ({
                ...previous,
                ...response.data.quiz,
                status: response.data.quiz.status,
            }));

            await loadQuizzes();

            setEditingQuestionId(null);
            setMessage("Quiz published successfully.");
        } catch (err) {
            setError(getErrorMessage(err, "Failed to publish quiz."));
        } finally {
            setLoading(false);
        }
    }

    function openQuiz(quiz) {
        clearNotifications();
        setSelectedQuiz(quiz);
        setEditingQuestionId(null);
        setQuestionForm(createEmptyQuestion());
    }

    function backToQuizList() {
        clearNotifications();
        setSelectedQuiz(null);
        setQuestions([]);
        setEditingQuestionId(null);
        setQuestionForm(createEmptyQuestion());
        setShowCreateForm(false);
        loadQuizzes();
    }

    if (courseLoading) {
        return <div className="p-6 text-gray-600">Loading course...</div>;
    }

    if (!course) {
        return (
            <div className="space-y-4 p-6">
                <h1 className="text-2xl font-bold">Quiz Management</h1>

                <p className="rounded-lg bg-red-50 p-3 text-red-700">
                    {error || "Could not load course details."}
                </p>

                <button
                    type="button"
                    onClick={loadCourse}
                    className={buttonClass}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 p-6">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">
                    Quiz Management
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    Manage quizzes and questions for your course.
                </p>
            </header>

            {/* Course information */}
            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold">
                            {course.title || course.name || "Course"}
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Course status:{" "}
                            <span className="font-medium capitalize">
                                {course.status || "unknown"}
                            </span>
                        </p>
                    </div>

                    <span
                        className={`rounded-full px-3 py-1 text-sm capitalize ${courseIsPublished
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-800"
                            }`}
                    >
                        {course.status || "unknown"}
                    </span>
                </div>

                {!courseIsPublished && (
                    <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                        You can prepare quizzes while this course is a draft.
                        Publish the course before publishing a quiz.
                    </p>
                )}
            </section>

            {/* Notifications */}
            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </div>
            )}

            {message && (
                <div
                    role="status"
                    className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
                >
                    {message}
                </div>
            )}

            {!selectedQuiz ? (
                <>
                    <QuizList
                        quizzes={quizzes}
                        quizzesLoading={quizzesLoading}
                        showCreateForm={showCreateForm}
                        onRefresh={loadQuizzes}
                        onToggleCreateForm={() => {
                            clearNotifications();
                            setShowCreateForm((previous) => !previous);
                        }}
                        onOpenQuiz={openQuiz}
                    />

                    {showCreateForm && (
                        <CreateQuizForm
                            quizForm={quizForm}
                            setQuizForm={setQuizForm}
                            loading={loading}
                            onSubmit={handleCreateQuiz}
                        />
                    )}
                </>
            ) : (
                <>
                    <button
                        type="button"
                        onClick={backToQuizList}
                        className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                        ← Back to Quizzes
                    </button>

                    {/* Selected quiz details */}
                    <section className="rounded-xl border bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {selectedQuiz.title}
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    {selectedQuiz.description ||
                                        "No description provided."}
                                </p>

                                <p className="mt-3 text-sm text-gray-600">
                                    {selectedQuiz.time_limit_minutes} minutes ·{" "}
                                    {selectedQuiz.max_attempts} attempt(s) ·{" "}
                                    {questions.length} question(s)
                                </p>
                            </div>

                            <span
                                className={`rounded-full px-3 py-1 text-sm capitalize ${selectedQuiz.status === "published"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-700"
                                    }`}
                            >
                                {selectedQuiz.status}
                            </span>
                        </div>
                    </section>

                    {/* Add/edit questions only while quiz is a draft */}
                    {quizIsDraft && (
                        <QuestionForm
                            questionForm={questionForm}
                            setQuestionForm={setQuestionForm}
                            editingQuestionId={editingQuestionId}
                            loading={loading}
                            onSubmit={handleSaveQuestion}
                            onCancelEdit={resetQuestionForm}
                            onOptionChange={handleOptionChange}
                            onQuestionTypeChange={handleQuestionTypeChange}
                            onToggleCorrectAnswer={toggleCorrectAnswer}
                        />
                    )}

                    <QuestionList
                        questions={questions}
                        questionsLoading={questionsLoading}
                        quizIsDraft={quizIsDraft}
                        onRefresh={() => loadQuestions(selectedQuiz.id)}
                        onEdit={startEditing}
                    />

                    {/* Publish controls */}
                    {quizIsDraft && (
                        <section className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
                            {!courseIsPublished && (
                                <p className="text-sm text-amber-800">
                                    Publish this course before publishing its quiz.
                                </p>
                            )}

                            {questions.length === 0 && (
                                <p className="text-sm text-gray-500">
                                    Add at least one question before publishing.
                                </p>
                            )}

                            <div className="flex flex-wrap justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={loadCourse}
                                    disabled={loading || courseLoading}
                                    className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Refresh Course Status
                                </button>

                                <button
                                    type="button"
                                    disabled={
                                        loading ||
                                        courseLoading ||
                                        !courseIsPublished ||
                                        questions.length === 0
                                    }
                                    onClick={handlePublish}
                                    className={buttonClass}
                                >
                                    {loading ? "Please wait..." : "Publish Quiz"}
                                </button>
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}