
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import {
    registerUser,
    instructorRegister,
} from "../features/auth/authSlice";

export default function Register() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { loading } = useSelector((state) => state.auth);

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "student",
    });

    const [error, setError] = useState("");

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setError("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        const { role, ...userData } = form;

        const result =
            role === "instructor"
                ? await dispatch(instructorRegister(userData))
                : await dispatch(registerUser(userData));

        if (
            role === "instructor"
                ? instructorRegister.fulfilled.match(result)
                : registerUser.fulfilled.match(result)
        ) {
            navigate("/login", {
                replace: true,
                state: {
                    message:
                        role === "instructor"
                            ? "Your instructor application has been submitted. You can access instructor features after an admin approves your application."
                            : "Account created successfully. Please sign in.",
                },
            });
        } else {
            setError(result.payload || "Registration failed.");
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
            <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl sm:p-10">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white">
                        LMS
                    </div>

                    <h1 className="text-3xl font-bold text-slate-900">
                        Create an account
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Join Mini LMS as a student or instructor.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label
                            htmlFor="name"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Full name
                        </label>

                        <input
                            id="name"
                            name="name"
                            type="text"
                            autoComplete="name"
                            required
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Email address
                        </label>

                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={form.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Password
                        </label>

                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            minLength={8}
                            required
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Create a password"
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="role"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Register as
                        </label>

                        <select
                            id="role"
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                            <option value="student">Student</option>
                            <option value="instructor">Instructor</option>
                        </select>

                        {form.role === "instructor" && (
                            <p className="mt-2 text-sm text-amber-700">
                                Instructor accounts require admin approval
                                before instructor features become available.
                            </p>
                        )}
                    </div>

                    {error && (
                        <p
                            role="alert"
                            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                        >
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading
                            ? "Creating account..."
                            : form.role === "instructor"
                                ? "Submit instructor application"
                                : "Create student account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-600">
                    Already registered?{" "}
                    <Link
                        to="/login"
                        className="font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                        Sign in
                    </Link>
                </p>
            </section>
        </main>
    );
}
