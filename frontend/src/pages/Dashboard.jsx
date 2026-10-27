
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { logout } from "../features/auth/authSlice";

export default function Dashboard({ role }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const user = useSelector((state) => state.auth.user);

    function handleLogout() {
        dispatch(logout());
        navigate("/login", { replace: true });
    }

    return (
        <main className="min-h-screen bg-slate-100 p-6 sm:p-10">
            <div className="mx-auto max-w-5xl">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                            Mini LMS
                        </p>

                        <h1 className="mt-2 text-3xl font-bold capitalize text-slate-900">
                            {role} dashboard
                        </h1>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Sign out
                    </button>
                </header>

                <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Welcome, {user?.name || "User"}
                    </h2>

                    <p className="mt-2 text-slate-600">
                        {user?.email}
                    </p>

                    <span className="mt-4 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium capitalize text-indigo-700">
                        {user?.role}
                    </span>
                </section>
            </div>
        </main>
    );
}
