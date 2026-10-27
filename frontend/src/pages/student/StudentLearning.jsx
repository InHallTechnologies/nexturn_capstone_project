
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    Bookmark,
    BookmarkCheck,
    BookOpen,
    CheckCircle2,
    Circle,
    LoaderCircle,
    PlayCircle,
    RotateCcw,
} from "lucide-react";

import {
    fetchStudentCourseContent,
    clearStudentLearning,
} from "../../features/student/studentLearningSlice";
import { fetchCourseProgress } from "../../features/student/studentSlice";
import { api } from "../../services/api";

function getVideoEmbedUrl(url) {
    if (!url) return null;

    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, "");

        if (host === "youtu.be") {
            const id = parsed.pathname.split("/").filter(Boolean)[0];

            return id
                ? `https://www.youtube-nocookie.com/embed/${id}`
                : null;
        }

        if (
            host === "youtube.com" ||
            host === "m.youtube.com" ||
            host === "youtube-nocookie.com"
        ) {
            if (parsed.pathname === "/watch") {
                const id = parsed.searchParams.get("v");

                return id
                    ? `https://www.youtube-nocookie.com/embed/${id}`
                    : null;
            }

            const match = parsed.pathname.match(
                /^\/(embed|shorts)\/([^/]+)/
            );

            if (match) {
                return `https://www.youtube-nocookie.com/embed/${match[2]}`;
            }
        }

        if (host === "vimeo.com") {
            const id = parsed.pathname.split("/").filter(Boolean).pop();

            return id && /^\d+$/.test(id)
                ? `https://player.vimeo.com/video/${id}`
                : null;
        }

        return null;
    } catch {
        return null;
    }
}

export default function StudentLearning() {
    const { courseId } = useParams();
    const dispatch = useDispatch();

    const {
        course,
        modules = [],
        loading,
        error,
    } = useSelector((state) => state.studentLearning);

    const { progressByCourse = {} } = useSelector(
        (state) => state.student || {}
    );

    const progress = progressByCourse[courseId];

    const [selectedLessonId, setSelectedLessonId] = useState(null);
    const [markingComplete, setMarkingComplete] = useState(false);
    const [actionError, setActionError] = useState("");

    // Resume Learning
    const [resumeLoaded, setResumeLoaded] = useState(false);

    // Bookmarks
    const [bookmarks, setBookmarks] = useState([]);
    const [bookmarksLoading, setBookmarksLoading] = useState(true);
    const [bookmarkActionLoading, setBookmarkActionLoading] =
        useState(false);
    const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

    // Load course content, course progress, and saved lesson.
    useEffect(() => {
        let cancelled = false;

        dispatch(clearStudentLearning());
        setSelectedLessonId(null);
        setActionError("");
        setResumeLoaded(false);

        dispatch(fetchStudentCourseContent(courseId));
        dispatch(fetchCourseProgress(courseId));

        async function loadLastLesson() {
            try {
                const { data } = await api.get(
                    `/student/courses/${courseId}/last-lesson`
                );

                if (!cancelled && data.last_lesson_id) {
                    setSelectedLessonId(data.last_lesson_id);
                }
            } catch (err) {
                console.error("Could not load last lesson:", err);
            } finally {
                if (!cancelled) {
                    setResumeLoaded(true);
                }
            }
        }

        loadLastLesson();

        return () => {
            cancelled = true;
            dispatch(clearStudentLearning());
        };
    }, [dispatch, courseId]);

    // Load this student's bookmarks for the current course.
    useEffect(() => {
        let cancelled = false;

        async function loadBookmarks() {
            setBookmarksLoading(true);

            try {
                const { data } = await api.get(
                    `/student/bookmarks?course_id=${encodeURIComponent(courseId)}`
                );

                if (!cancelled) {
                    setBookmarks(data.bookmarks || []);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error("Could not load bookmarks:", err);
                    setActionError(
                        err?.response?.data?.error ||
                        "Could not load bookmarks."
                    );
                }
            } finally {
                if (!cancelled) {
                    setBookmarksLoading(false);
                }
            }
        }

        loadBookmarks();

        return () => {
            cancelled = true;
        };
    }, [courseId]);

    // Flatten lessons so navigation works across modules.
    const allLessons = useMemo(
        () =>
            modules.flatMap((module) =>
                (module.lessons || []).map((lesson) => ({
                    ...lesson,
                    moduleId: module.id,
                    moduleTitle: module.title,
                }))
            ),
        [modules]
    );

    const bookmarkedLessonIds = useMemo(
        () => new Set(bookmarks.map((bookmark) => bookmark.lesson_id)),
        [bookmarks]
    );

    const completedLessonIds = useMemo(() => {
        const ids = new Set();

        for (const module of progress?.modules || []) {
            for (const lesson of module.lessons || []) {
                if (lesson.completed) {
                    ids.add(lesson.id);
                }
            }
        }

        return ids;
    }, [progress]);

    // Select the saved lesson, or the first lesson if no valid saved lesson exists.
    useEffect(() => {
        if (!resumeLoaded) return;

        if (!allLessons.length) {
            setSelectedLessonId(null);
            return;
        }

        const selectedStillExists = allLessons.some(
            (lesson) => lesson.id === selectedLessonId
        );

        if (!selectedStillExists) {
            setSelectedLessonId(allLessons[0].id);
        }
    }, [allLessons, selectedLessonId, resumeLoaded]);

    // Persist the selected lesson for Resume Learning.
    useEffect(() => {
        if (!resumeLoaded || !selectedLessonId) return;

        const lessonExists = allLessons.some(
            (lesson) => lesson.id === selectedLessonId
        );

        if (!lessonExists) return;

        let cancelled = false;

        async function saveLastLesson() {
            try {
                await api.put(
                    `/student/courses/${courseId}/last-lesson`,
                    { lesson_id: selectedLessonId }
                );
            } catch (err) {
                if (!cancelled) {
                    console.error("Could not save last lesson:", err);
                }
            }
        }

        saveLastLesson();

        return () => {
            cancelled = true;
        };
    }, [courseId, resumeLoaded, selectedLessonId, allLessons]);

    const currentIndex = allLessons.findIndex(
        (lesson) => lesson.id === selectedLessonId
    );

    const currentLesson =
        currentIndex >= 0 ? allLessons[currentIndex] : null;

    const completedCount = completedLessonIds.size;
    const totalLessons = allLessons.length;

    const percentage = totalLessons
        ? Math.round((completedCount / totalLessons) * 100)
        : 0;

    const isCompleted = currentLesson
        ? completedLessonIds.has(currentLesson.id)
        : false;

    const isBookmarked = currentLesson
        ? bookmarkedLessonIds.has(currentLesson.id)
        : false;

    const videoEmbedUrl = getVideoEmbedUrl(currentLesson?.video_url);

    // Add or remove a bookmark for the current lesson.
    async function handleToggleBookmark() {
        if (!currentLesson || bookmarkActionLoading) return;

        setBookmarkActionLoading(true);
        setActionError("");

        try {
            if (bookmarkedLessonIds.has(currentLesson.id)) {
                await api.delete(
                    `/student/bookmarks/${currentLesson.id}`
                );

                setBookmarks((previous) =>
                    previous.filter(
                        (bookmark) =>
                            bookmark.lesson_id !== currentLesson.id
                    )
                );
            } else {
                const { data } = await api.post(
                    `/student/bookmarks/${currentLesson.id}`
                );

                if (data.bookmark) {
                    setBookmarks((previous) => {
                        const alreadyExists = previous.some(
                            (bookmark) =>
                                bookmark.lesson_id === currentLesson.id
                        );

                        return alreadyExists
                            ? previous
                            : [data.bookmark, ...previous];
                    });
                } else {
                    // Reload from the API if the response doesn't include the bookmark.
                    const { data: refreshed } = await api.get(
                        `/student/bookmarks?course_id=${encodeURIComponent(courseId)}`
                    );

                    setBookmarks(refreshed.bookmarks || []);
                }
            }
        } catch (err) {
            setActionError(
                err?.response?.data?.error ||
                "Could not update the bookmark. Please try again."
            );
        } finally {
            setBookmarkActionLoading(false);
        }
    }

    async function handleMarkComplete() {
        if (!currentLesson || isCompleted || markingComplete) return;

        setMarkingComplete(true);
        setActionError("");

        try {
            await api.put(
                `/progress/courses/${courseId}/modules/${currentLesson.moduleId}/lessons/${currentLesson.id}`
            );

            await dispatch(fetchCourseProgress(courseId)).unwrap();
        } catch (err) {
            setActionError(
                err?.response?.data?.error ||
                (typeof err === "string" ? err : null) ||
                "Could not update lesson progress. Please try again."
            );
        } finally {
            setMarkingComplete(false);
        }
    }

    async function handleMarkIncomplete() {
        if (!currentLesson || !isCompleted || markingComplete) return;

        setMarkingComplete(true);
        setActionError("");

        try {
            await api.delete(
                `/progress/courses/${courseId}/modules/${currentLesson.moduleId}/lessons/${currentLesson.id}`
            );

            await dispatch(fetchCourseProgress(courseId)).unwrap();
        } catch (err) {
            setActionError(
                err?.response?.data?.error ||
                (typeof err === "string" ? err : null) ||
                "Could not update lesson progress. Please try again."
            );
        } finally {
            setMarkingComplete(false);
        }
    }

    async function handleToggleCompletion() {
        if (isCompleted) {
            await handleMarkIncomplete();
        } else {
            await handleMarkComplete();
        }
    }

    function goToLesson(index) {
        if (index < 0 || index >= allLessons.length) return;

        setSelectedLessonId(allLessons[index].id);
        setActionError("");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    function getModuleProgress(module) {
        const lessons = module.lessons || [];

        const completed = lessons.filter((lesson) =>
            completedLessonIds.has(lesson.id)
        ).length;

        const total = lessons.length;

        return {
            completed,
            total,
            percentage: total
                ? Math.round((completed / total) * 100)
                : 0,
        };
    }

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
                <span className="ml-3 text-sm text-slate-600">
                    Loading your course...
                </span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-3xl p-6">
                <Link
                    to="/student/courses"
                    className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                    <ArrowLeft size={16} />
                    Back to courses
                </Link>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                    <h2 className="font-semibold text-red-800">
                        Unable to load this course
                    </h2>

                    <p className="mt-2 text-sm text-red-700">{error}</p>

                    <button
                        type="button"
                        onClick={() => {
                            dispatch(fetchStudentCourseContent(courseId));
                            dispatch(fetchCourseProgress(courseId));
                        }}
                        className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6">
            {/* Course header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <Link
                        to="/student/courses"
                        className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600"
                    >
                        <ArrowLeft size={16} />
                        Back to courses
                    </Link>

                    <h1 className="text-2xl font-bold text-slate-900">
                        {course?.title || "Course learning"}
                    </h1>

                    <p className="mt-1 max-w-3xl text-sm text-slate-600">
                        {course?.description}
                    </p>
                </div>

                <Link
                    to={`/student/courses/${courseId}/quizzes`}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                    <BookOpen size={16} />
                    Course quizzes
                </Link>

                <div className="min-w-48 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-600">
                            Course progress
                        </span>

                        <span className="text-sm font-bold text-indigo-700">
                            {percentage}%
                        </span>
                    </div>

                    <div
                        className="h-2 overflow-hidden rounded-full bg-slate-100"
                        role="progressbar"
                        aria-label="Overall course progress"
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    >
                        <div
                            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                        {completedCount} of {totalLessons} lessons completed
                    </p>
                </div>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                {/* Course sidebar */}
                <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 p-4">
                        <div className="flex items-center gap-2 font-semibold text-slate-900">
                            <BookOpen size={18} className="text-indigo-600" />
                            Course content
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                            {modules.length} modules · {totalLessons} lessons
                        </p>

                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                                <CheckCircle2 size={13} />
                                Completed
                            </span>

                            <span className="inline-flex items-center gap-1 text-indigo-700">
                                <PlayCircle size={13} />
                                In progress
                            </span>

                            <span className="inline-flex items-center gap-1 text-slate-500">
                                <Circle size={13} />
                                Not started
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setShowBookmarkedOnly((previous) => !previous)
                            }
                            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${showBookmarkedOnly
                                ? "border-amber-300 bg-amber-50 text-amber-800"
                                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            <Bookmark size={16} />
                            {showBookmarkedOnly
                                ? "Show all lessons"
                                : "Show bookmarked lessons"}
                            <span className="rounded-full bg-white px-2 py-0.5 text-xs">
                                {bookmarks.length}
                            </span>
                        </button>

                        {bookmarksLoading && (
                            <p className="mt-2 text-xs text-slate-500">
                                Loading bookmarks...
                            </p>
                        )}
                    </div>

                    {modules.length === 0 ? (
                        <p className="p-5 text-sm text-slate-500">
                            No modules have been added to this course yet.
                        </p>
                    ) : (
                        <div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
                            {modules.map((module, moduleIndex) => {
                                const moduleProgress = getModuleProgress(module);

                                const visibleLessons = (
                                    module.lessons || []
                                ).filter(
                                    (lesson) =>
                                        !showBookmarkedOnly ||
                                        bookmarkedLessonIds.has(lesson.id)
                                );

                                if (
                                    showBookmarkedOnly &&
                                    visibleLessons.length === 0
                                ) {
                                    return null;
                                }

                                return (
                                    <section key={module.id}>
                                        <div className="bg-slate-50 px-4 py-3">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Module{" "}
                                                {module.order || moduleIndex + 1}
                                            </p>

                                            <h2 className="mt-1 text-sm font-semibold text-slate-800">
                                                {module.title}
                                            </h2>

                                            {module.description && (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {module.description}
                                                </p>
                                            )}

                                            {!showBookmarkedOnly && (
                                                <div className="mt-3">
                                                    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                                                        <span className="text-slate-500">
                                                            {moduleProgress.completed} of{" "}
                                                            {moduleProgress.total} lessons completed
                                                        </span>

                                                        <span className="font-semibold text-indigo-700">
                                                            {moduleProgress.percentage}%
                                                        </span>
                                                    </div>

                                                    <div
                                                        className="h-1.5 overflow-hidden rounded-full bg-slate-200"
                                                        role="progressbar"
                                                        aria-label={`${module.title} progress`}
                                                        aria-valuenow={moduleProgress.percentage}
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                    >
                                                        <div
                                                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                                            style={{
                                                                width: `${moduleProgress.percentage}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-2">
                                            {visibleLessons.map(
                                                (lesson, lessonIndex) => {
                                                    const completed =
                                                        completedLessonIds.has(lesson.id);

                                                    const selected =
                                                        selectedLessonId === lesson.id;

                                                    const bookmarked =
                                                        bookmarkedLessonIds.has(lesson.id);

                                                    const status = completed
                                                        ? "Completed"
                                                        : selected
                                                            ? "In progress"
                                                            : "Not started";

                                                    return (
                                                        <button
                                                            type="button"
                                                            key={lesson.id}
                                                            onClick={() =>
                                                                goToLesson(
                                                                    allLessons.findIndex(
                                                                        (item) =>
                                                                            item.id === lesson.id
                                                                    )
                                                                )
                                                            }
                                                            aria-current={
                                                                selected ? "true" : undefined
                                                            }
                                                            className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${selected
                                                                ? "bg-indigo-50 text-indigo-800"
                                                                : "text-slate-700 hover:bg-slate-50"
                                                                }`}
                                                        >
                                                            <span className="mt-0.5 shrink-0">
                                                                {completed ? (
                                                                    <CheckCircle2
                                                                        size={18}
                                                                        className="text-emerald-600"
                                                                    />
                                                                ) : selected ? (
                                                                    <PlayCircle
                                                                        size={18}
                                                                        className="text-indigo-600"
                                                                    />
                                                                ) : (
                                                                    <Circle
                                                                        size={18}
                                                                        className="text-slate-300"
                                                                    />
                                                                )}
                                                            </span>

                                                            <span className="min-w-0 flex-1">
                                                                <span className="flex items-center gap-2 text-sm font-medium">
                                                                    <span>
                                                                        {lesson.order || lessonIndex + 1}.{" "}
                                                                        {lesson.title}
                                                                    </span>

                                                                    {bookmarked && (
                                                                        <BookmarkCheck
                                                                            size={15}
                                                                            className="shrink-0 text-amber-600"
                                                                        />
                                                                    )}
                                                                </span>

                                                                <span
                                                                    className={`mt-1 block text-xs font-medium ${completed
                                                                        ? "text-emerald-600"
                                                                        : selected
                                                                            ? "text-indigo-600"
                                                                            : "text-slate-500"
                                                                        }`}
                                                                >
                                                                    {status}
                                                                </span>
                                                            </span>
                                                        </button>
                                                    );
                                                }
                                            )}

                                            {showBookmarkedOnly &&
                                                visibleLessons.length === 0 && (
                                                    <p className="p-3 text-xs text-slate-500">
                                                        No bookmarked lessons in this module.
                                                    </p>
                                                )}
                                        </div>
                                    </section>
                                );
                            })}

                            {showBookmarkedOnly &&
                                bookmarks.length === 0 &&
                                !bookmarksLoading && (
                                    <div className="p-5 text-center">
                                        <Bookmark className="mx-auto h-8 w-8 text-slate-300" />
                                        <p className="mt-2 text-sm font-medium text-slate-700">
                                            No bookmarked lessons yet
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Open a lesson and select Bookmark lesson.
                                        </p>
                                    </div>
                                )}
                        </div>
                    )}
                </aside>

                {/* Selected lesson content */}
                <main className="min-w-0 space-y-5">
                    {!currentLesson ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                            <BookOpen className="mx-auto h-10 w-10 text-slate-300" />

                            <h2 className="mt-3 text-lg font-semibold text-slate-900">
                                No lessons available
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                This course does not have any lessons yet.
                            </p>
                        </div>
                    ) : (
                        <>
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                {currentLesson.video_url && (
                                    <div className="aspect-video bg-slate-950">
                                        {videoEmbedUrl ? (
                                            <iframe
                                                src={videoEmbedUrl}
                                                title={currentLesson.title}
                                                className="h-full w-full"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                allowFullScreen
                                                referrerPolicy="strict-origin-when-cross-origin"
                                            />
                                        ) : (
                                            <video
                                                className="h-full w-full"
                                                controls
                                                preload="metadata"
                                                src={currentLesson.video_url}
                                            >
                                                Your browser does not support video playback.
                                            </video>
                                        )}
                                    </div>
                                )}

                                <div className="p-5 sm:p-8">
                                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                                        <span>{currentLesson.moduleTitle}</span>
                                        <span>•</span>
                                        <span>
                                            Lesson {currentIndex + 1} of {totalLessons}
                                        </span>

                                        {isCompleted && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                                                <CheckCircle2 size={13} />
                                                Completed
                                            </span>
                                        )}
                                    </div>

                                    <h2 className="mt-3 text-2xl font-bold text-slate-900">
                                        {currentLesson.title}
                                    </h2>

                                    <div className="mt-6 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 sm:text-base">
                                        {currentLesson.content?.trim() ||
                                            "There is no written content for this lesson."}
                                    </div>

                                    {actionError && (
                                        <div
                                            role="alert"
                                            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                                        >
                                            {actionError}
                                        </div>
                                    )}

                                    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                goToLesson(currentIndex - 1)
                                            }
                                            disabled={currentIndex <= 0}
                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <ArrowLeft size={16} />
                                            Previous lesson
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleToggleBookmark}
                                            disabled={bookmarkActionLoading}
                                            aria-pressed={isBookmarked}
                                            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${isBookmarked
                                                ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                                }`}
                                        >
                                            {bookmarkActionLoading ? (
                                                <LoaderCircle
                                                    size={16}
                                                    className="animate-spin"
                                                />
                                            ) : isBookmarked ? (
                                                <BookmarkCheck size={16} />
                                            ) : (
                                                <Bookmark size={16} />
                                            )}

                                            {bookmarkActionLoading
                                                ? "Updating..."
                                                : isBookmarked
                                                    ? "Remove bookmark"
                                                    : "Bookmark lesson"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleToggleCompletion}
                                            disabled={markingComplete}
                                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${isCompleted
                                                ? "bg-amber-600 hover:bg-amber-700"
                                                : "bg-emerald-600 hover:bg-emerald-700"
                                                }`}
                                        >
                                            {markingComplete ? (
                                                <LoaderCircle
                                                    size={16}
                                                    className="animate-spin"
                                                />
                                            ) : isCompleted ? (
                                                <RotateCcw size={16} />
                                            ) : (
                                                <CheckCircle2 size={16} />
                                            )}

                                            {markingComplete
                                                ? "Updating progress..."
                                                : isCompleted
                                                    ? "Mark as not completed"
                                                    : "Mark as completed"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                goToLesson(currentIndex + 1)
                                            }
                                            disabled={
                                                currentIndex >= totalLessons - 1
                                            }
                                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Next lesson
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {percentage === 100 && totalLessons > 0 && (
                                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                                    <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" />

                                    <div>
                                        <h3 className="font-semibold text-emerald-900">
                                            Course completed!
                                        </h3>

                                        <p className="mt-1 text-sm text-emerald-800">
                                            You've completed every lesson in this
                                            course. You can revisit any lesson from
                                            the sidebar.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
