
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../services/api";

export default function CourseDetails() {
    const { courseId } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState({
        title: "",
        description: "",
        category: "",
        status: "",
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        async function loadCourse() {
            try {
                setLoading(true);
                setError("");

                const response = await api.get(`/courses/${courseId}`);
                setCourse(response.data.course);
            } catch (err) {
                setError(
                    err.response?.data?.error || "Failed to load course details."
                );
            } finally {
                setLoading(false);
            }
        }

        loadCourse();
    }, [courseId]);

    function handleChange(event) {
        const { name, value } = event.target;

        setCourse((current) => ({
            ...current,
            [name]: value,
        }));

        setSuccess("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await api.patch(`/courses/${courseId}`, {
                title: course.title,
                description: course.description,
                category: course.category,
            });

            setCourse(response.data.course ?? course);
            setSuccess("Course details updated successfully.");
        } catch (err) {
            setError(
                err.response?.data?.error || "Failed to update course details."
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="p-6">Loading course details...</div>;
    }

    if (error && !course.title) {
        return (
            <div className="p-6">
                <p className="mb-4 text-red-600">{error}</p>
                <button
                    onClick={() => navigate("/instructor/courses")}
                    className="rounded-lg border px-4 py-2"
                >
                    Back to My Courses
                </button>
            </div>
        );
    }

    const isDraft = course.status === "draft";

    return (
        <div className="mx-auto max-w-3xl p-6">
            <button
                onClick={() => navigate("/instructor/courses")}
                className="mb-5 text-sm font-medium text-teal-800 hover:underline"
            >
                &larr; Back to My Courses
            </button>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Course Details
                    </h1>
                    <p className="mt-1 text-gray-600">
                        View and manage your course information.
                    </p>
                </div>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium capitalize text-gray-700">
                    {course.status?.replaceAll("_", " ")}
                </span>
            </div>

            {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 rounded-lg bg-green-50 p-3 text-green-700">
                    {success}
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="space-y-5 rounded-xl border bg-white p-6 shadow-sm"
            >
                <div>
                    <label
                        htmlFor="title"
                        className="mb-2 block font-medium text-gray-700"
                    >
                        Course Title
                    </label>
                    <input
                        id="title"
                        name="title"
                        value={course.title}
                        onChange={handleChange}
                        required
                        disabled={!isDraft || saving}
                        className="w-full rounded-lg border p-3 disabled:bg-gray-100"
                    />
                </div>

                <div>
                    <label
                        htmlFor="description"
                        className="mb-2 block font-medium text-gray-700"
                    >
                        Description
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        value={course.description || ""}
                        onChange={handleChange}
                        required
                        rows={5}
                        disabled={!isDraft || saving}
                        className="w-full rounded-lg border p-3 disabled:bg-gray-100"
                    />
                </div>

                <div>
                    <label
                        htmlFor="category"
                        className="mb-2 block font-medium text-gray-700"
                    >
                        Category
                    </label>
                    <input
                        id="category"
                        name="category"
                        value={course.category || ""}
                        onChange={handleChange}
                        required
                        disabled={!isDraft || saving}
                        className="w-full rounded-lg border p-3 disabled:bg-gray-100"
                    />
                </div>

                {isDraft ? (
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                ) : (
                    <p className="text-sm text-gray-600">
                        Course details cannot be edited while the course is in this status.
                    </p>
                )}
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={() =>
                        navigate(`/instructor/courses/${courseId}/modules`)
                    }
                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                >
                    Manage Modules
                </button>

                <button
                    type="button"
                    onClick={() =>
                        navigate(`/instructor/courses/${courseId}/quizzes`)
                    }
                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                >
                    Manage Quizzes
                </button>
            </div>
        </div>
    );
}
