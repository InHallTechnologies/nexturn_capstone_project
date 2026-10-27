import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../services/api";

export default function CourseModules() {
    const { courseId } = useParams();
    const navigate = useNavigate();

    const [modules, setModules] = useState([]);
    const [courseTitle, setCourseTitle] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function loadData() {
        try {
            setLoading(true);
            setError("");

            const [courseResponse, modulesResponse] = await Promise.all([
                api.get(`/courses/${courseId}`),
                api.get(`/courses/${courseId}/modules`),
            ]);

            setCourseTitle(courseResponse.data.course.title);

            const data =
                modulesResponse.data.modules ??
                modulesResponse.data;

            setModules(
                Array.isArray(data)
                    ? [...data].sort(
                        (a, b) => (a.order ?? 0) - (b.order ?? 0)
                    )
                    : []
            );
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Failed to load course modules."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [courseId]);

    async function handleSubmit(event) {
        event.preventDefault();

        if (!title.trim() || !description.trim()) {
            setError("Module title and description are required.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            await api.post(`/courses/${courseId}/modules`, {
                title: title.trim(),
                description: description.trim(),
                order: modules.length + 1,
            });

            setTitle("");
            setDescription("");

            await loadData();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Failed to create the module."
            );
        } finally {
            setSaving(false);
        }
    }

    function handleManageLessons(module) {
        const moduleId = module.id ?? module._id;

        if (!moduleId) {
            setError(
                "Module ID is missing. Please refresh the module list."
            );
            return;
        }

        navigate(`/instructor/modules/${moduleId}/lessons`);
    }

    if (loading) {
        return (
            <div className="p-6 text-gray-600">
                Loading modules...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl p-6">
            <button
                type="button"
                onClick={() =>
                    navigate(`/instructor/courses/${courseId}`)
                }
                className="mb-5 text-sm font-medium text-teal-800 hover:underline"
            >
                &larr; Back to Course Details
            </button>

            <h1 className="text-3xl font-bold text-gray-900">
                Course Modules
            </h1>

            <p className="mt-2 text-gray-600">{courseTitle}</p>

            {error && (
                <div
                    role="alert"
                    className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="mt-6 space-y-4 rounded-xl border bg-white p-6 shadow-sm"
            >
                <h2 className="text-xl font-semibold">Add a Module</h2>

                <div>
                    <label
                        htmlFor="moduleTitle"
                        className="mb-2 block font-medium text-gray-700"
                    >
                        Module Title
                    </label>

                    <input
                        id="moduleTitle"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        required
                        maxLength={150}
                        className="w-full rounded-lg border p-3"
                        placeholder="e.g. HTML and CSS Fundamentals"
                    />
                </div>

                <div>
                    <label
                        htmlFor="moduleDescription"
                        className="mb-2 block font-medium text-gray-700"
                    >
                        Description
                    </label>

                    <textarea
                        id="moduleDescription"
                        value={description}
                        onChange={(event) =>
                            setDescription(event.target.value)
                        }
                        required
                        rows={3}
                        className="w-full rounded-lg border p-3"
                        placeholder="Describe what students will learn."
                    />
                </div>

                <button
                    type="submit"
                    disabled={
                        saving || !title.trim() || !description.trim()
                    }
                    className="rounded-lg bg-teal-800 px-5 py-3 font-medium text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? "Adding..." : "Add Module"}
                </button>
            </form>

            <section className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                        Existing Modules ({modules.length})
                    </h2>

                    <button
                        type="button"
                        onClick={loadData}
                        className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
                    >
                        Refresh
                    </button>
                </div>

                {modules.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-6 text-gray-500">
                        No modules yet. Add your first module above.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {modules.map((module, index) => (
                            <div
                                key={module.id ?? module._id ?? index}
                                className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-white p-5"
                            >
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-gray-900">
                                        Module {module.order ?? index + 1}:{" "}
                                        {module.title}
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-600">
                                        {module.description ||
                                            "No description provided."}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleManageLessons(module)
                                    }
                                    className="shrink-0 rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900"
                                >
                                    Manage Lessons
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
