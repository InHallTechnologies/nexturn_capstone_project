
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
    LayoutDashboard,
    GraduationCap,
    BookOpen,
    PlusCircle,
    UsersRound,
    LogOut,
    PanelLeft,
} from "lucide-react";

import { logout } from "../features/auth/authSlice";

const navigation = [
    {
        label: "Overview",
        path: "/instructor/dashboard",
        icon: LayoutDashboard,
        end: true,
    },
    {
        label: "My Courses",
        path: "/instructor/courses",
        icon: BookOpen,
        end: true,
    },
    {
        label: "Create Course",
        path: "/instructor/courses/new",
        icon: PlusCircle,
        end: true,
    },
];

export default function InstructorLayout() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const user = useSelector((state) => state.auth.user);
    const pathname = location.pathname;

    // Matches the enrolled-students and individual-student routes.
    const studentPerformanceMatch = pathname.match(
        /^\/instructor\/courses\/([^/]+)\/students(?:\/([^/]+))?$/
    );

    const isStudentPerformanceHome =
        pathname === "/instructor/students";

    const isStudentPerformance = Boolean(studentPerformanceMatch);

    const isCreateCourse =
        pathname === "/instructor/courses/new";

    const isMyCourses =
        pathname === "/instructor/courses";

    const isCourseModules =
        pathname.includes("/modules");

    const isCourseDetails =
        /^\/instructor\/courses\/[^/]+$/.test(pathname) &&
        !isCreateCourse;

    const currentPage = isStudentPerformanceHome
        ? "Student Performance"
        : isStudentPerformance
            ? studentPerformanceMatch[2]
                ? "Student Details"
                : "Student Performance"
            : isCourseModules
                ? "Course Modules"
                : isCreateCourse
                    ? "Create Course"
                    : isCourseDetails
                        ? "Course Details"
                        : isMyCourses
                            ? "My Courses"
                            : "Overview";

    const studentPerformanceActive =
        isStudentPerformance || isStudentPerformanceHome;

    function handleLogout() {
        dispatch(logout());
        navigate("/login", { replace: true });
    }

    function handleStudentPerformance() {
        // From student details, return to that course's student list.
        if (studentPerformanceMatch) {
            navigate(
                `/instructor/courses/${studentPerformanceMatch[1]}/students`
            );
            return;
        }

        // Open course selection when there is no course context.
        navigate("/instructor/students");
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900 md:flex-row">
            <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white md:h-screen md:w-64 md:border-b-0 md:border-r">
                <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                        <GraduationCap size={23} />
                    </div>

                    <div>
                        <h1 className="text-lg font-bold tracking-tight">
                            Mini LMS
                        </h1>
                        <p className="text-xs text-slate-500">
                            Instructor Workspace
                        </p>
                    </div>
                </div>

                <div className="px-3 py-4">
                    <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Workspace
                    </p>

                    <nav
                        aria-label="Instructor navigation"
                        className="flex gap-1 overflow-x-auto md:flex-col"
                    >
                        {navigation.map((item) => {
                            const Icon = item.icon;

                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.end}
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

                        <button
                            type="button"
                            onClick={handleStudentPerformance}
                            aria-current={
                                studentPerformanceActive ? "page" : undefined
                            }
                            className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition ${studentPerformanceActive
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                }`}
                        >
                            <UsersRound size={19} />
                            <span>Student Performance</span>
                        </button>
                    </nav>
                </div>

                <div className="mt-auto hidden border-t border-slate-200 p-4 md:block">
                    <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                            {(user?.name || "I").charAt(0).toUpperCase()}
                        </div>

                        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                            <p className="truncate text-sm font-semibold">
                                {user?.name || "Instructor"}
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

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-5 py-3 sm:px-8">
                    <div className="flex items-center gap-2">
                        <PanelLeft
                            size={19}
                            className="text-slate-400"
                        />
                        <span className="text-sm text-slate-500">
                            Instructor /{" "}
                            <span className="font-semibold text-slate-800">
                                {currentPage}
                            </span>
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block">
                            <p className="text-sm font-semibold">
                                {user?.name || "Instructor"}
                            </p>
                            <p className="text-xs capitalize text-slate-500">
                                {user?.role || "instructor"}
                            </p>
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                            {(user?.name || "I").charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
