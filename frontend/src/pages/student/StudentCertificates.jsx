
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import {
    Award,
    Download,
    FileBadge,
    RefreshCw,
    ShieldCheck,
} from "lucide-react";

export default function StudentCertificates() {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [downloadingId, setDownloadingId] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function loadCertificates() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get("/certificates");
                const certificateList = response.data.certificates || [];

                // Fetch course details for each certificate.
                const detailedCertificates = await Promise.all(
                    certificateList.map(async (item) => {
                        try {
                            const detailResponse = await api.get(
                                `/certificates/${encodeURIComponent(item.certificate_id)}`
                            );

                            return {
                                ...item,
                                course: detailResponse.data.course,
                            };
                        } catch {
                            // Keep the certificate visible even if course details fail.
                            return {
                                ...item,
                                course: null,
                            };
                        }
                    })
                );

                if (!cancelled) {
                    setCertificates(detailedCertificates);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.data?.error ||
                        "Unable to load your certificates. Please try again."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadCertificates();

        return () => {
            cancelled = true;
        };
    }, []);

    async function handleDownload(certificate) {
        setDownloadingId(certificate.certificate_id);
        setError("");

        try {
            const response = await api.get(
                `/certificates/${encodeURIComponent(
                    certificate.certificate_id
                )}/download`,
                {
                    responseType: "blob",
                }
            );

            const pdfBlob = new Blob([response.data], {
                type: "application/pdf",
            });

            const downloadUrl = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");

            link.href = downloadUrl;
            link.download = `${certificate.certificate_id}.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            // Axios may return a JSON error as a Blob for this request.
            let message = "Unable to download the certificate.";

            if (err.response?.data instanceof Blob) {
                try {
                    const errorData = JSON.parse(
                        await err.response.data.text()
                    );
                    message = errorData.error || message;
                } catch {
                    // Keep the fallback message.
                }
            } else if (err.response?.data?.error) {
                message = err.response.data.error;
            }

            setError(message);
        } finally {
            setDownloadingId(null);
        }
    }

    function formatDate(dateString) {
        if (!dateString) return "Date unavailable";

        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    }

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8">
                    <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                            <Award size={27} />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                                My Certificates
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                View and download your course completion certificates.
                            </p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                        <p>{error}</p>

                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="shrink-0 font-semibold underline"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white">
                        <RefreshCw
                            size={28}
                            className="animate-spin text-indigo-600"
                        />
                        <p className="mt-4 text-sm text-slate-500">
                            Loading your certificates...
                        </p>
                    </div>
                ) : certificates.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                        <FileBadge
                            size={48}
                            className="mx-auto text-slate-300"
                        />

                        <h2 className="mt-4 text-lg font-semibold text-slate-800">
                            No certificates yet
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            Complete an eligible course to earn a certificate. Your
                            certificates will appear here when they have been issued.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mb-5 flex items-center justify-between">
                            <p className="text-sm text-slate-600">
                                Certificates earned
                            </p>

                            <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
                                {certificates.length}
                            </span>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            {certificates.map((certificate) => {
                                const isDownloading =
                                    downloadingId === certificate.certificate_id;

                                return (
                                    <article
                                        key={certificate.certificate_id}
                                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                                    >
                                        <div className="h-2 bg-gradient-to-r from-indigo-600 via-violet-500 to-amber-400" />

                                        <div className="p-6">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                                    <Award size={28} />
                                                </div>

                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                    <ShieldCheck size={14} />
                                                    Issued
                                                </span>
                                            </div>

                                            <h2 className="mt-5 text-xl font-bold text-slate-900">
                                                {certificate.course?.title ||
                                                    "Course Certificate"}
                                            </h2>

                                            <p className="mt-2 text-sm text-slate-500">
                                                Issued on {formatDate(certificate.issued_at)}
                                            </p>

                                            <div className="mt-5 rounded-lg bg-slate-50 p-3">
                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                    Certificate ID
                                                </p>

                                                <p className="mt-1 break-all font-mono text-sm text-slate-800">
                                                    {certificate.certificate_id}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleDownload(certificate)}
                                                disabled={isDownloading}
                                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {isDownloading ? (
                                                    <>
                                                        <RefreshCw
                                                            size={17}
                                                            className="animate-spin"
                                                        />
                                                        Preparing PDF...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download size={18} />
                                                        Download Certificate
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
