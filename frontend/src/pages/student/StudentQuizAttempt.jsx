
import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Clock3,
    LoaderCircle,
    Send,
} from "lucide-react";

import { api } from "../../services/api";
import {
    startQuizAttempt,
    fetchAttemptQuestions,
    submitQuizAttempt,
    fetchAttemptResult,
    setQuizAnswer,
    clearCurrentAttempt,
} from "../../features/student/studentQuizSlice";

function formatTime(seconds) {
    const safe = Math.max(0, seconds);
    const minutes = Math.floor(safe / 60);
    const remaining = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export default function StudentQuizAttempt() {
    const { quizId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const courseId = location.state?.courseId;

    const {
        attempt,
        questions,
        deadline,
        result,
        answers = {},
        loading,
        submitting,
        error,
    } = useSelector((state) => state.studentQuiz);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [remainingSeconds, setRemainingSeconds] = useState(null);
    const [confirmSubmit, setConfirmSubmit] = useState(false);
    const [localError, setLocalError] = useState("");
    const submittedRef = useRef(false);

    const attemptId = attempt?.id || attempt?.attempt_id;

    const handleSubmit = useCallback(
        async (automatic = false) => {
            if (!attemptId || submitting || submittedRef.current || result) return;

            submittedRef.current = true;
            setConfirmSubmit(false);
            setLocalError("");

            try {
                await dispatch(
                    submitQuizAttempt({
                        attemptId,
                        answers: questions.map((question) => ({
                            question_id: question.id,
                            answer: answers[question.id] ??
                                (question.type === "multi_select" ? [] : ""),
                        })),
                    })
                ).unwrap();
            } catch (submitError) {
                submittedRef.current = false;

                // If the deadline passed, the backend may have expired the attempt.
                if (automatic) {
                    try {
                        await dispatch(fetchAttemptResult(attemptId)).unwrap();
                    } catch {
                        setLocalError(
                            typeof submitError === "string"
                                ? submitError
                                : "Time expired, but the result could not be retrieved. Please refresh."
                        );
                    }
                } else {
                    setLocalError(
                        typeof submitError === "string"
                            ? submitError
                            : "Submission failed. Please try again."
                    );
                }
            }
        },
        [attemptId, submitting, result, dispatch, questions, answers]
    );

    useEffect(() => {
        let cancelled = false;

        async function initialize() {
            submittedRef.current = false;
            setCurrentIndex(0);
            setLocalError("");

            try {
                // A refresh can lose Redux memory. Start endpoint resumes an existing
                // in-progress attempt when the backend supports that behaviour.
                const started = await dispatch(startQuizAttempt(quizId)).unwrap();
                const currentAttempt = started.attempt || started;
                const id = currentAttempt.id || currentAttempt.attempt_id;

                if (cancelled) return;

                if (currentAttempt.status === "submitted") {
                    await dispatch(fetchAttemptResult(id)).unwrap();
                    return;
                }

                await dispatch(fetchAttemptQuestions(id)).unwrap();
            } catch (initializeError) {
                if (!cancelled) {
                    setLocalError(
                        typeof initializeError === "string"
                            ? initializeError
                            : "Unable to open this quiz."
                    );
                }
            }
        }

        dispatch(clearCurrentAttempt());
        initialize();

        return () => {
            cancelled = true;
        };
    }, [dispatch, quizId]);

    useEffect(() => {
        if (!deadline || result) return;

        const updateCountdown = () => {
            const end = new Date(deadline).getTime();
            if (!Number.isFinite(end)) {
                setRemainingSeconds(null);
                return;
            }

            const seconds = Math.max(0, Math.ceil((end - Date.now()) / 1000));
            setRemainingSeconds(seconds);
        };

        updateCountdown();
        const timer = setInterval(updateCountdown, 1000);

        return () => clearInterval(timer);
    }, [deadline, result]);

    useEffect(() => {
        if (remainingSeconds === 0 && attemptId && !result) {
            handleSubmit(true);
        }
    }, [remainingSeconds, attemptId, result, handleSubmit]);

    const currentQuestion = questions[currentIndex];

    function updateAnswer(question, option) {
        setLocalError("");

        if (question.type === "multi_select") {
            const existing = answers[question.id] || [];
            const next = existing.includes(option)
                ? existing.filter((value) => value !== option)
                : [...existing, option];

            dispatch(setQuizAnswer({
                questionId: question.id,
                answer: next,
            }));
        } else {
            dispatch(setQuizAnswer({
                questionId: question.id,
                answer: option,
            }));
        }
    }

    if (loading && !questions.length && !result) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center gap-3 text-slate-600">
                <LoaderCircle className="animate-spin" size={24} />
                Preparing your quiz...
            </div>
        );
    }

    if (result) {
        return (
            <div className="mx-auto max-w-2xl p-5 sm:p-8">
                <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
                    <h1 className="mt-4 text-2xl font-bold text-slate-900">
                        Quiz result
                    </h1>
                    <p className="mt-2 text-slate-600">
                        Your submission has been processed.
                    </p>

                    <div className="my-7 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-indigo-50 p-5">
                            <p className="text-sm text-indigo-700">Score</p>
                            <p className="mt-1 text-3xl font-bold text-indigo-900">
                                {result.score ?? 0}/{result.total_questions ?? 0}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 p-5">
                            <p className="text-sm text-emerald-700">Percentage</p>
                            <p className="mt-1 text-3xl font-bold text-emerald-900">
                                {Number(result.percentage ?? 0).toFixed(1)}%
                            </p>
                        </div>
                    </div>

                    <p className="text-sm text-slate-500">
                        Status: {result.status || "submitted"}
                    </p>

                    {Array.isArray(result.answers) && result.answers.length > 0 && (
                        <div className="mt-7 space-y-3 text-left">
                            <h2 className="font-semibold text-slate-900">
                                Answer review
                            </h2>
                            {result.answers.map((answer, index) => (
                                <div
                                    key={answer.question_id || index}
                                    className="rounded-xl border border-slate-200 p-4"
                                >
                                    <p className="text-sm text-slate-600">
                                        Question {index + 1}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                                        {answer.is_correct ? (
                                            <CheckCircle2 size={16} className="text-emerald-600" />
                                        ) : (
                                            <AlertTriangle size={16} className="text-amber-600" />
                                        )}
                                        {answer.is_correct ? "Correct" : "Incorrect"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <Link
                        to={courseId ? `/student/courses/${courseId}/quizzes` : "/student/courses"}
                        className="mt-8 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                        Back to quizzes
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <Link
                    to={courseId ? `/student/courses/${courseId}/quizzes` : "/student/courses"}
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600"
                >
                    <ArrowLeft size={16} /> Exit quiz
                </Link>

                <div
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-lg font-bold ${remainingSeconds !== null && remainingSeconds <= 60
                        ? "bg-red-100 text-red-700"
                        : "bg-indigo-50 text-indigo-700"
                        }`}
                >
                    <Clock3 size={18} />
                    {remainingSeconds === null ? "--:--" : formatTime(remainingSeconds)}
                </div>
            </div>

            {(error || localError) && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {localError || error}
                </div>
            )}

            {questions.length > 0 && currentQuestion && (
                <>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <span className="text-sm font-medium text-slate-500">
                                Question {currentIndex + 1} of {questions.length}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                {currentQuestion.type === "multi_select"
                                    ? "Select all that apply"
                                    : "Single choice"}
                            </span>
                        </div>

                        <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-indigo-600 transition-all"
                                style={{
                                    width: `${((currentIndex + 1) / questions.length) * 100}%`,
                                }}
                            />
                        </div>

                        <h1 className="text-xl font-bold leading-relaxed text-slate-900">
                            {currentQuestion.question}
                        </h1>

                        <div className="mt-6 space-y-3">
                            {(currentQuestion.options || []).map((option, index) => {
                                const selected = currentQuestion.type === "multi_select"
                                    ? (answers[currentQuestion.id] || []).includes(option)
                                    : answers[currentQuestion.id] === option;

                                return (
                                    <button
                                        key={`${option}-${index}`}
                                        onClick={() => updateAnswer(currentQuestion, option)}
                                        className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${selected
                                            ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                                            : "border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
                                            }`}
                                    >
                                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center border text-xs ${currentQuestion.type === "multi_select"
                                            ? "rounded"
                                            : "rounded-full"
                                            } ${selected
                                                ? "border-indigo-600 bg-indigo-600 text-white"
                                                : "border-slate-300"
                                            }`}>
                                            {selected ? "✓" : String.fromCharCode(65 + index)}
                                        </span>
                                        <span className="text-sm font-medium">{option}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <button
                            onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                            disabled={currentIndex === 0}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        >
                            <ArrowLeft size={16} /> Previous
                        </button>

                        <span className="text-sm text-slate-500">
                            {questions.filter((question) => {
                                const answer = answers[question.id];
                                return Array.isArray(answer)
                                    ? answer.length > 0
                                    : Boolean(answer);
                            }).length} of {questions.length} answered
                        </span>

                        {currentIndex < questions.length - 1 ? (
                            <button
                                onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                            >
                                Next <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={() => setConfirmSubmit(true)}
                                disabled={submitting}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                <Send size={16} /> Submit quiz
                            </button>
                        )}
                    </div>
                </>
            )}

            {confirmSubmit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-bold text-slate-900">
                            Submit your quiz?
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            You have answered{" "}
                            {questions.filter((question) => {
                                const answer = answers[question.id];
                                return Array.isArray(answer)
                                    ? answer.length > 0
                                    : Boolean(answer);
                            }).length} of {questions.length} questions. You won't be able to
                            change your answers after submission.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmSubmit(false)}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
                            >
                                Continue quiz
                            </button>
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {submitting && <LoaderCircle size={16} className="animate-spin" />}
                                Confirm submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
