
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    BookOpen,
    Search,
    ArrowRight,
    GraduationCap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
    enrollInCourse,
    fetchMyEnrollments,
    fetchPublishedCourses,
} from "../../features/student/studentSlice";

export default function StudentCourses() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const {
        courses,
        enrollments,
        coursesLoading,
        enrollmentsLoading,
        coursesError,
        enrollmentsError,
        enrollingCourseId,
        enrollmentError,
    } = useSelector((state) => state.student);

    useEffect(() => {
        dispatch(fetchPublishedCourses());
        dispatch(fetchMyEnrollments());
    }, [dispatch]);

    const enrollmentByCourse = Object.fromEntries(
        enrollments.map((enrollment) => [
            enrollment.course_id,
            enrollment,
        ])
    );

    const loading = coursesLoading || enrollmentsLoading;
    const error = coursesError || enrollmentsError;

    async function handleEnroll(courseId) {
        const result = await dispatch(enrollInCourse(courseId));

        if (enrollInCourse.fulfilled.match(result)) {
            dispatch(fetchMyEnrollments());
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 text-slate-900">
            <header>
                <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                    Course catalogue
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">
                    Explore courses
                </h1>
                <p className="mt-2 text-slate-500">
                    Find a course, enroll, and start building your skills.
                </p>
            </header>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                <Search size={19} />
                <span>
                    Showing published courses available for enrollment
                </span>
            </div>

            {enrollmentError && (
                <p
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
                >
                    {enrollmentError}
                </p>
            )}

            {error && (
                <p
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
                >
                    {error}
                </p>
            )}

            {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                    Loading courses...
                </div>
            ) : courses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <GraduationCap
                        size={36}
                        className="mx-auto text-slate-400"
                    />
                    <h2 className="mt-3 font-semibold">
                        No published courses yet
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Check back when instructors publish their courses.
                    </p>
                </div>
            ) : (
                <div className="grid items-stretch gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {courses.map((course) => {
                        const enrollment = enrollmentByCourse[course.id];
                        const isEnrolled = Boolean(
                            enrollment &&
                            ["active", "completed"].includes(enrollment.status)
                        );
                        const isCancelled = enrollment?.status === "cancelled";
                        const isEnrolling = enrollingCourseId === course.id;

                        return (
                            <article
                                key={course.id}
                                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                        <BookOpen size={23} />
                                    </div>
                                    {course.category && (
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                            {course.category}
                                        </span>
                                    )}
                                </div>

                                <h2 className="mt-5 text-lg font-bold leading-7">
                                    {course.title}
                                </h2>
                                <p className="mt-3 min-h-[6rem] text-sm leading-6 text-slate-500">
                                    {course.description ||
                                        "Explore the course content and begin learning."}
                                </p>

                                <div className="mt-auto border-t border-slate-100 pt-4">
                                    {isEnrolled ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate(
                                                    `/student/courses/${course.id}`
                                                )
                                            }
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                                        >
                                            {enrollment.status === "completed"
                                                ? "Review course"
                                                : "Continue learning"}
                                            <ArrowRight size={16} />
                                        </button>
                                    ) : isCancelled ? (
                                        <button
                                            type="button"
                                            disabled
                                            className="w-full cursor-not-allowed rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500"
                                        >
                                            Re-enrollment unavailable
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={isEnrolling}
                                            onClick={() => handleEnroll(course.id)}
                                            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isEnrolling
                                                ? "Enrolling..."
                                                : "Enroll in course"}
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
