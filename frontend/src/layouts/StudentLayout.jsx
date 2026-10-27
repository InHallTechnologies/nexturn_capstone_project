
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import {
    LayoutDashboard,
    BookOpen,
    GraduationCap,
    LogOut,
    PanelLeft,
    ClipboardList,
    Award,
} from "lucide-react";

import { logout } from "../features/auth/authSlice";

const navigation = [
    {
        label: "Overview",
        path: "/student/dashboard",
        icon: LayoutDashboard,
    },
    {
        label: "Explore Courses",
        path: "/student/courses",
        icon: BookOpen,
    },
    {
        label: "Quiz History",
        path: "/student/quiz-history",
        icon: ClipboardList,
    },
    {
        label: "My Certificates",
        path: "/student/certificates",
        icon: Award,
    },
];

export default function StudentLayout() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const user = useSelector((state) => state.auth.user);

    const currentPage =
        navigation.find((item) => location.pathname === item.path)?.label ||
        (location.pathname.includes("/quiz-attempts/")
            ? "Quiz Result"
            : location.pathname.includes("/quizzes/")
                ? "Quiz Attempt"
                : location.pathname.includes("/quizzes")
                    ? "Course Quizzes"
                    : location.pathname.includes("/certificates")
                        ? "My Certificates"
                        : location.pathname.includes("/courses/")
                            ? "Course Learning"
                            : "Overview");

    function handleLogout() {
        dispatch(logout());
        navigate("/login", { replace: true });
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 md:h-screen md:flex-row md:overflow-hidden">
            {/* Sidebar */}
            <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white md:h-screen md:w-64 md:border-b-0 md:border-r">
                {/* Brand */}
                <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                        <GraduationCap size={23} />
                    </div>

                    <div>
                        <h1 className="text-lg font-bold tracking-tight">
                            Mini LMS
                        </h1>

                        <p className="text-xs text-slate-500">
                            Student Workspace
                        </p>
                    </div>
                </div>

                {/* Navigation */}
                <div className="px-3 py-4">
                    <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Learning
                    </p>

                    <nav
                        aria-label="Student navigation"
                        className="flex gap-1 overflow-x-auto md:flex-col"
                    >
                        {navigation.map((item) => {
                            const Icon = item.icon;

                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end
                                    className={({ isActive }) =>
                                        `flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${isActive
                                            ? "bg-indigo-50 text-indigo-700"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                        }`
                                    }
                                >
                                    <Icon size={19} />
                                    <span>{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </nav>
                </div>

                {/* Desktop user information and logout */}
                <div className="mt-auto hidden border-t border-slate-200 p-4 md:block">
                    <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                            {(user?.name || "S").charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                                {user?.name || "Student"}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                                {user?.email}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                    >
                        <LogOut size={18} />
                        Sign out
                    </button>
                </div>

                {/* Mobile logout */}
                <div className="border-t border-slate-200 p-3 md:hidden">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
                    >
                        <LogOut size={18} />
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col md:overflow-hidden">
                {/* Header */}
                <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-5 py-3 sm:px-8">
                    <div className="flex items-center gap-2">
                        <PanelLeft
                            size={19}
                            className="text-slate-400"
                        />

                        <span className="text-sm text-slate-500">
                            Student /
                            <span className="font-semibold text-slate-800">
                                {" "}{currentPage}
                            </span>
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block">
                            <p className="text-sm font-semibold">
                                {user?.name || "Student"}
                            </p>

                            <p className="text-xs capitalize text-slate-500">
                                {user?.role || "student"}
                            </p>
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                            {(user?.name || "S").charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Routed page */}
                <main className="min-h-0 flex-1 p-4 sm:p-6 lg:overflow-y-auto lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
