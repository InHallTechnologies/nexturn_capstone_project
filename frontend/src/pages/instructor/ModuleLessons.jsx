import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../services/api";

const initialForm = {
    title: "",
    content: "",
    video_url: "",
    order: "",
};

export default function ModuleLessons() {
    const { moduleId } = useParams();
    const navigate = useNavigate();

    const [lessons, setLessons] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [editingLessonId, setEditingLessonId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingLessonId, setDeletingLessonId] = useState(null);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function fetchLessons() {
        try {
            setLoading(true);
            setError("");

            const response = await api.get(
                `/modules/${moduleId}/lessons`
            );

            const data = response.data.lessons || [];

            setLessons(
                [...data].sort((a, b) => a.order - b.order)
            );
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Failed to load lessons."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchLessons();
    }, [moduleId]);

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    function startEditing(lesson) {
        setEditingLessonId(lesson.id);

        setForm({
            title: lesson.title || "",
            content: lesson.content || "",
            video_url: lesson.video_url || "",
            order: String(lesson.order ?? ""),
        });

        setError("");
        setSuccess("");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    function cancelEditing() {
        setEditingLessonId(null);
        setForm(initialForm);
        setError("");
        setSuccess("");
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setSuccess("");

        const lessonOrder = Number(form.order);

        if (!form.title.trim()) {
            setError("Lesson title is required.");
            return;
        }

        if (
            !Number.isInteger(lessonOrder) ||
            lessonOrder < 1
        ) {
            setError("Order must be a positive integer.");
            return;
        }

        const payload = {
            title: form.title.trim(),
            content: form.content,
            video_url: form.video_url.trim(),
            order: lessonOrder,
        };

        try {
            setSaving(true);

            if (editingLessonId) {
                const response = await api.put(
                    `/modules/${moduleId}/lessons/${editingLessonId}`,
                    payload
                );

                const updatedLesson = response.data.lesson;

                setLessons((previous) =>
                    previous
                        .map((lesson) =>
                            lesson.id === editingLessonId
                                ? updatedLesson
                                : lesson
                        )
                        .sort((a, b) => a.order - b.order)
                );

                setSuccess("Lesson updated successfully.");
            } else {
                const response = await api.post(
                    `/modules/${moduleId}/lessons`,
                    payload
                );

                setLessons((previous) =>
                    [...previous, response.data.lesson].sort(
                        (a, b) => a.order - b.order
                    )
                );

                setSuccess("Lesson created successfully.");
            }

            setForm(initialForm);
            setEditingLessonId(null);
        } catch (err) {
            setError(
                err.response?.data?.error ||
                `Failed to ${editingLessonId ? "update" : "create"} lesson.`
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(lesson) {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${lesson.title}"? This action cannot be undone.`
        );

        if (!confirmed) return;

        setError("");
        setSuccess("");
        setDeletingLessonId(lesson.id);

        try {
            await api.delete(
                `/modules/${moduleId}/lessons/${lesson.id}`
            );

            setLessons((previous) =>
                previous.filter((item) => item.id !== lesson.id)
            );

            if (editingLessonId === lesson.id) {
                setEditingLessonId(null);
                setForm(initialForm);
            }

            setSuccess("Lesson deleted successfully.");
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Failed to delete lesson."
            );
        } finally {
            setDeletingLessonId(null);
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Lesson Management
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Create, edit, and delete lessons in this module.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Back to Modules
                </button>
            </div>

            {/* Messages */}
            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </div>
            )}

            {success && (
                <div
                    role="status"
                    className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
                >
                    {success}
                </div>
            )}

            {/* Create / Edit Form */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-semibold text-gray-900">
                    {editingLessonId ? "Edit Lesson" : "Create a Lesson"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label
                            htmlFor="lessonTitle"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Lesson Title *
                        </label>

                        <input
                            id="lessonTitle"
                            name="title"
                            type="text"
                            value={form.title}
                            onChange={handleChange}
                            maxLength={150}
                            required
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            placeholder="Introduction to the topic"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="lessonContent"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Lesson Content
                        </label>

                        <textarea
                            id="lessonContent"
                            name="content"
                            value={form.content}
                            onChange={handleChange}
                            maxLength={50000}
                            rows={5}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            placeholder="Write the lesson content..."
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="lessonVideo"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Video URL
                        </label>

                        <input
                            id="lessonVideo"
                            name="video_url"
                            type="url"
                            value={form.video_url}
                            onChange={handleChange}
                            maxLength={2048}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            placeholder="https://example.com/video"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="lessonOrder"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Lesson Order *
                        </label>

                        <input
                            id="lessonOrder"
                            name="order"
                            type="number"
                            min="1"
                            step="1"
                            value={form.order}
                            onChange={handleChange}
                            required
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            placeholder="1"
                        />
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving
                                ? "Saving..."
                                : editingLessonId
                                    ? "Save Changes"
                                    : "Create Lesson"}
                        </button>

                        {editingLessonId && (
                            <button
                                type="button"
                                onClick={cancelEditing}
                                disabled={saving}
                                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </form>
            </section>

            {/* Lessons List */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Lessons ({lessons.length})
                    </h2>

                    <button
                        type="button"
                        onClick={fetchLessons}
                        disabled={loading}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                        {loading ? "Loading..." : "Refresh"}
                    </button>
                </div>

                {loading ? (
                    <p className="py-8 text-center text-gray-500">
                        Loading lessons...
                    </p>
                ) : lessons.length === 0 ? (
                    <p className="rounded-lg bg-gray-50 py-8 text-center text-gray-500">
                        No lessons yet. Create your first lesson above.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {lessons.map((lesson) => (
                            <div
                                key={lesson.id}
                                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-gray-200 p-4"
                            >
                                <div className="flex min-w-0 flex-1 gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700">
                                        {lesson.order}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-gray-900">
                                            {lesson.title}
                                        </h3>

                                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-500">
                                            {lesson.content ||
                                                "No lesson content added."}
                                        </p>

                                        {lesson.video_url && (
                                            <a
                                                href={lesson.video_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                            >
                                                Open lesson video
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="flex shrink-0 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => startEditing(lesson)}
                                        disabled={Boolean(deletingLessonId)}
                                        className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDelete(lesson)}
                                        disabled={Boolean(deletingLessonId)}
                                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                    >
                                        {deletingLessonId === lesson.id
                                            ? "Deleting..."
                                            : "Delete"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
