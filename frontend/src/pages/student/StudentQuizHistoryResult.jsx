
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../services/api";
import {
    ArrowLeft,
    CheckCircle2,
    ClipboardCheck,
    LoaderCircle,
    XCircle,
} from "lucide-react";

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function StudentQuizHistoryResult() {
    const { attemptId } = useParams();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadResult() {
            setLoading(true);
            setError("");

            try {
                const { data } = await api.get(`/attempts/${attemptId}/result`);
                if (!cancelled) setResult(data);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.data?.error || "Could not load this quiz result."
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadResult();

        return () => {
            cancelled = true;
        };
    }, [attemptId]);

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center gap-3 text-slate-500">
                <LoaderCircle size={24} className="animate-spin" />
                Loading result...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
            <Link
                to="/student/quiz-history"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600"
            >
                <ArrowLeft size={16} /> Back to quiz history
            </Link>

            {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                    {error}
                </div>
            )}

            {!error && result && (
                <>
                    <header>
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
                                <ClipboardCheck size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">
                                    Quiz result
                                </h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Attempt ID: {result.attempt_id || attemptId}
                                </p>
                            </div>
                        </div>
                    </header>

                    {result.status === "in_progress" && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            This attempt has not been submitted yet, so a final score is not available.
                        </div>
                    )}

                    {result.status === "expired" && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                            This attempt expired. A final score may not be available.
                        </div>
                    )}

                    {result.status !== "in_progress" && result.status !== "expired" && (
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                <p className="text-sm text-slate-500">Score</p>
                                <p className="mt-2 text-3xl font-bold text-slate-900">
                                    {result.score ?? 0}/{result.total_questions ?? "—"}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                <p className="text-sm text-slate-500">Percentage</p>
                                <p className="mt-2 text-3xl font-bold text-indigo-700">
                                    {Number(result.percentage ?? 0).toFixed(1)}%
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                <p className="text-sm text-slate-500">Status</p>
                                <p className="mt-2 font-bold capitalize text-emerald-700">
                                    {result.status}
                                </p>
                            </div>
                        </div>
                    )}

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                        <h2 className="text-lg font-bold text-slate-900">
                            Attempt details
                        </h2>
                        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-slate-500">Started</dt>
                                <dd className="mt-1 font-medium text-slate-800">
                                    {formatDate(result.started_at)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Submitted</dt>
                                <dd className="mt-1 font-medium text-slate-800">
                                    {formatDate(result.submitted_at)}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    {Array.isArray(result.answers) && result.answers.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-lg font-bold text-slate-900">
                                Answer review
                            </h2>
                            {result.answers.map((answer, index) => (
                                <article
                                    key={answer.question_id || index}
                                    className="rounded-2xl border border-slate-200 bg-white p-5"
                                >
                                    <div className="flex items-center gap-2">
                                        {answer.is_correct ? (
                                            <CheckCircle2 size={19} className="text-emerald-600" />
                                        ) : (
                                            <XCircle size={19} className="text-red-600" />
                                        )}
                                        <h3 className="font-semibold text-slate-900">
                                            Question {index + 1}
                                        </h3>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Your answer:{" "}
                                        {Array.isArray(answer.answer)
                                            ? answer.answer.join(", ") || "Not answered"
                                            : answer.answer || "Not answered"}
                                    </p>
                                    <p className={`mt-2 text-sm font-medium ${answer.is_correct ? "text-emerald-700" : "text-red-700"
                                        }`}>
                                        {answer.is_correct ? "Correct" : "Incorrect"}
                                    </p>
                                </article>
                            ))}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
