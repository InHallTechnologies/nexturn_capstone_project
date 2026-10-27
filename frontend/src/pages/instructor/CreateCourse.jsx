
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";

export default function CreateCourse() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await api.post("/courses", form);
            const course = response.data.course;

            navigate(`/instructor/courses/${course.id}`);
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Failed to create the course. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto max-w-3xl p-6 text-slate-900">
            <h1 className="mb-2 text-3xl font-bold text-slate-900">
                Create a Course
            </h1>

            <p className="mb-6 text-slate-500">
                Enter the basic details to create your course.
            </p>

            {error && (
                <div
                    role="alert"
                    className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700"
                >
                    {error}
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <div>
                    <label
                        htmlFor="title"
                        className="mb-2 block text-sm font-medium text-slate-700"
                    >
                        Course title
                    </label>

                    <input
                        id="title"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        placeholder="e.g. Introduction to React"
                    />
                </div>

                <div>
                    <label
                        htmlFor="description"
                        className="mb-2 block text-sm font-medium text-slate-700"
                    >
                        Description
                    </label>

                    <textarea
                        id="description"
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        required
                        rows={4}
                        className="w-full resize-y rounded-lg border border-slate-300 p-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        placeholder="What will students learn?"
                    />
                </div>

                <div>
                    <label
                        htmlFor="category"
                        className="mb-2 block text-sm font-medium text-slate-700"
                    >
                        Category
                    </label>

                    <input
                        id="category"
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        placeholder="e.g. Web Development"
                    />
                </div>

                <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Creating..." : "Create Course"}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate("/instructor/courses")}
                        className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
