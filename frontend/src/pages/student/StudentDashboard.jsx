
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
    BookOpen,
    CheckCircle2,
    Clock3,
    ArrowRight,
    GraduationCap,
} from "lucide-react";
import {
    fetchPublishedCourses,
    fetchMyEnrollments,
    fetchCourseProgress,
} from "../../features/student/studentSlice";

function StatCard({ title, value, description, icon: Icon }) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                    <Icon size={20} />
                </div>
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
        </article>
    );
}

export default function StudentDashboard() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const {
        courses,
        enrollments,
        coursesLoading,
        enrollmentsLoading,
        coursesError,
        enrollmentsError,
        progressByCourse,
        progressLoading,
    } = useSelector((state) => state.student);

    useEffect(() => {
        dispatch(fetchPublishedCourses());
        dispatch(fetchMyEnrollments());
    }, [dispatch]);

    useEffect(() => {
        enrollments
            .filter((enrollment) =>
                ["active", "completed"].includes(enrollment.status)
            )
            .forEach((enrollment) => {
                if (!progressByCourse[enrollment.course_id]) {
                    dispatch(fetchCourseProgress(enrollment.course_id));
                }
            });
    }, [dispatch, enrollments, progressByCourse]);

    const enrolledCourses = enrollments.filter((enrollment) =>
        ["active", "completed"].includes(enrollment.status)
    );

    const activeCourses = enrolledCourses.filter(
        (enrollment) => enrollment.status === "active"
    );

    const completedCourses = enrolledCourses.filter(
        (enrollment) => enrollment.status === "completed"
    );

    const courseById = Object.fromEntries(
        courses.map((course) => [course.id, course])
    );

    const loading = coursesLoading || enrollmentsLoading;
    const error = coursesError || enrollmentsError;

    return (
        <div className="mx-auto max-w-7xl space-y-8 text-slate-900">
            <section className="overflow-hidden rounded-2xl bg-indigo-700 p-6 text-white shadow-sm sm:p-8">
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-sm font-medium text-indigo-200">
                            YOUR LEARNING SPACE
                        </p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight">
                            Welcome back!
                        </h1>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100">
                            Continue your courses, track your progress, and
                            build new skills at your own pace.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate("/student/courses")}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                    >
                        Explore courses <ArrowRight size={17} />
                    </button>
                </div>
            </section>

            {error && (
                <div
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
                >
                    {error}
                </div>
            )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Enrolled Courses"
                    value={enrolledCourses.length}
                    description="Courses in your learning list"
                    icon={BookOpen}
                />
                <StatCard
                    title="In Progress"
                    value={activeCourses.length}
                    description="Courses you can continue"
                    icon={Clock3}
                />
                <StatCard
                    title="Completed Courses"
                    value={completedCourses.length}
                    description="Courses you've completed"
                    icon={CheckCircle2}
                />
                <StatCard
                    title="Available Courses"
                    value={courses.length}
                    description="Published courses to explore"
                    icon={GraduationCap}
                />
            </section>

            <section>
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold">Continue learning</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Pick up where you left off.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate("/student/courses")}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                        Explore all
                    </button>
                </div>

                {loading ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                        Loading your learning dashboard...
                    </div>
                ) : enrolledCourses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                        <BookOpen className="mx-auto text-slate-400" size={34} />
                        <h3 className="mt-3 font-semibold">
                            Your learning journey starts here
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                            Explore published courses and enroll to start learning.
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate("/student/courses")}
                            className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                            Browse courses
                        </button>
                    </div>
                ) : (
                    <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {enrolledCourses.map((enrollment) => {
                            const course = courseById[enrollment.course_id];
                            const progress =
                                progressByCourse[enrollment.course_id];
                            const percent =
                                progress?.completion_percentage ?? 0;

                            return (
                                <article
                                    key={enrollment.id || enrollment.course_id}
                                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                            <BookOpen size={22} />
                                        </div>
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${enrollment.status === "completed"
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-indigo-50 text-indigo-700"
                                                }`}
                                        >
                                            {enrollment.status}
                                        </span>
                                    </div>

                                    <h3 className="mt-4 text-lg font-bold">
                                        {course?.title || "Enrolled course"}
                                    </h3>
                                    <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-500">
                                        {course?.description ||
                                            "Continue learning and track your progress."}
                                    </p>

                                    <div className="mt-5">
                                        <div className="mb-2 flex justify-between text-xs font-medium">
                                            <span className="text-slate-500">
                                                Course progress
                                            </span>
                                            <span className="text-slate-800">
                                                {progressLoading[enrollment.course_id]
                                                    ? "Loading..."
                                                    : `${percent}%`}
                                            </span>
                                        </div>
                                        <div
                                            className="h-2 overflow-hidden rounded-full bg-slate-100"
                                            role="progressbar"
                                            aria-valuenow={percent}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-label="Course completion"
                                        >
                                            <div
                                                className="h-full rounded-full bg-indigo-600 transition-all"
                                                style={{
                                                    width: `${Math.min(100, Math.max(0, percent))}%`,
                                                }}
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-slate-500">
                                            {progress
                                                ? `${progress.completed_lessons} of ${progress.total_lessons} lessons completed`
                                                : "Progress will appear here"}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                `/student/courses/${enrollment.course_id}`
                                            )
                                        }
                                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                                    >
                                        {enrollment.status === "completed"
                                            ? "Review course"
                                            : "Continue learning"}
                                        <ArrowRight size={16} />
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
