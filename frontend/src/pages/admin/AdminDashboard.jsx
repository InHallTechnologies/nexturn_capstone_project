
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    Clock3,
    UsersRound,
    BookOpen,
    GraduationCap,
    Award,
    ClipboardList,
    FileQuestion,

} from "lucide-react";

import { fetchAdminStats } from "../../features/admin/adminStatsSlice";

import DashboardHeader from "../../components/admin/DashboardHeader";
import DashboardLoading from "../../components/admin/DashboardLoading";
import DashboardError from "../../components/admin/DashboardError";
import StatisticsGrid from "../../components/admin/StatisticsGrid";
import StatisticsBreakdown from "../../components/admin/StatisticsBreakdown";

export default function AdminDashboard() {
    const dispatch = useDispatch();

    const { data, loading, error, lastUpdated } = useSelector(
        (state) => state.adminStats
    );

    useEffect(() => {
        dispatch(fetchAdminStats());
    }, [dispatch]);

    function handleRefresh() {
        dispatch(fetchAdminStats());
    }

    // Summary cards configuration
    const summaryStats = [
        {
            title: "Total Users",
            value: data?.users?.total ?? 0,
            description: `${data?.users?.students ?? 0} students`,
            icon: UsersRound,
            color: "indigo",
        },
        {
            title: "Total Courses",
            value: data?.courses?.total ?? 0,
            description: `${data?.courses?.published ?? 0} published`,
            icon: BookOpen,
            color: "teal",
        },
        {
            title: "Enrollments",
            value: data?.enrollments?.total ?? 0,
            description: `${data?.enrollments?.completed ?? 0} completed`,
            icon: GraduationCap,
            color: "amber",
        },
        {
            title: "Certificates",
            value: data?.certificates?.total ?? 0,
            description: "Total certificates issued",
            icon: Award,
            color: "violet",
        },
    ];

    // Detailed statistics configuration
    const statisticsBreakdowns = [
        {
            title: "Users",
            icon: UsersRound,
            items: [
                { label: "Total users", value: data?.users?.total ?? 0 },
                { label: "Students", value: data?.users?.students ?? 0 },
                { label: "Instructors", value: data?.users?.instructors ?? 0 },
                {
                    label: "Approved instructors",
                    value: data?.users?.approved_instructors ?? 0,
                },
                {
                    label: "Pending instructors",
                    value: data?.users?.pending_instructors ?? 0,
                },
                {
                    label: "Rejected instructors",
                    value: data?.users?.rejected_instructors ?? 0,
                },
                { label: "Admins", value: data?.users?.admins ?? 0 },
            ],
        },
        {
            title: "Courses",
            icon: BookOpen,
            items: [
                { label: "Total courses", value: data?.courses?.total ?? 0 },
                { label: "Published", value: data?.courses?.published ?? 0 },
                { label: "Draft", value: data?.courses?.draft ?? 0 },
                {
                    label: "Pending review",
                    value: data?.courses?.pending_review ?? 0,
                },
                { label: "Rejected", value: data?.courses?.rejected ?? 0 },
            ],
        },
        {
            title: "Enrollments",
            icon: GraduationCap,
            items: [
                { label: "Total enrollments", value: data?.enrollments?.total ?? 0 },
                { label: "Active", value: data?.enrollments?.active ?? 0 },
                { label: "Completed", value: data?.enrollments?.completed ?? 0 },
                { label: "Cancelled", value: data?.enrollments?.cancelled ?? 0 },
            ],
        },
        {
            title: "Quizzes",
            icon: ClipboardList,
            items: [
                { label: "Total quizzes", value: data?.quizzes?.total ?? 0 },
                { label: "Published", value: data?.quizzes?.published ?? 0 },
                { label: "Total questions", value: data?.quizzes?.questions ?? 0 },
            ],
        },
        {
            title: "Quiz Attempts",
            icon: FileQuestion,
            items: [
                { label: "Total attempts", value: data?.attempts?.total ?? 0 },
                { label: "In progress", value: data?.attempts?.in_progress ?? 0 },
                { label: "Submitted", value: data?.attempts?.submitted ?? 0 },
                { label: "Expired", value: data?.attempts?.expired ?? 0 },
            ],
        },
        {
            title: "Certificates",
            icon: Award,
            items: [
                {
                    label: "Total certificates",
                    value: data?.certificates?.total ?? 0,
                },
            ],
        },
    ];

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            <DashboardHeader onRefresh={handleRefresh} loading={loading} />

            {error && (
                <DashboardError
                    message={error}
                    onRetry={handleRefresh}
                    loading={loading}
                />
            )}

            {loading && !data && <DashboardLoading />}

            {data && (
                <>
                    <StatisticsGrid statistics={summaryStats} />

                    <StatisticsBreakdown sections={statisticsBreakdowns} />
                </>
            )}

            {!loading && !error && !data && (
                <p className="text-sm text-gray-500">
                    No statistics are available yet.
                </p>
            )}

            {lastUpdated && (
                <p className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock3 size={16} />
                    Last updated: {new Date(lastUpdated).toLocaleString()}
                </p>
            )}
        </div>
    );
}
