
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    UsersRound,
    RefreshCw,
    Search,
    Trash2,
    Mail,
} from "lucide-react";

import {
    fetchUsers,
    deleteUser,
    clearUserMessages,
} from "../../features/admin/usersSlice";

const roleOptions = [
    { label: "All roles", value: "" },
    { label: "Students", value: "student" },
    { label: "Instructors", value: "instructor" },
];

export default function UserManagement() {
    const dispatch = useDispatch();
    const { users, loading, processingId, error, successMessage } =
        useSelector((state) => state.users);

    const [role, setRole] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        dispatch(fetchUsers(role));
    }, [dispatch, role]);

    useEffect(() => {
        return () => dispatch(clearUserMessages());
    }, [dispatch]);

    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();

        return users.filter((user) => {
            // Never display admin accounts
            if (user.role?.toLowerCase() === "admin") {
                return false;
            }

            const matchesSearch =
                !query ||
                user.name?.toLowerCase().includes(query) ||
                user.email?.toLowerCase().includes(query);

            return matchesSearch;
        });
    }, [users, search]);


    function handleDelete(user) {
        if (user.role !== "student") {
            window.alert(
                "Only student accounts can be removed from this page. " +
                "Manage instructors in Instructor Applications."
            );
            return;
        }

        const confirmed = window.confirm(
            `Delete the student account for ${user.name || user.email}?`
        );

        if (confirmed) {
            dispatch(deleteUser(user.id));
        }
    }

    function handleRefresh() {
        dispatch(fetchUsers(role));
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <p className="text-sm font-medium text-indigo-600">
                        Administration
                    </p>
                    <h1 className="mt-1 text-2xl font-bold text-gray-900">
                        User Management
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        View and manage platform accounts.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                    <RefreshCw
                        size={16}
                        className={loading ? "animate-spin" : ""}
                    />
                    Refresh
                </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                            <UsersRound size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">
                                Users displayed
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                {filteredUsers.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Students</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                        {users.filter((user) => user.role === "student").length}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row">
                <div className="relative flex-1">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                </div>

                <select
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
                >
                    {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    <p>{error}</p>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="mt-2 font-semibold underline"
                    >
                        Try again
                    </button>
                </div>
            )}

            {successMessage && (
                <div
                    role="status"
                    className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
                >
                    {successMessage}
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-5 py-4">
                    <h2 className="font-semibold text-gray-900">
                        Platform Users
                    </h2>
                </div>

                {loading && users.length === 0 ? (
                    <div className="flex items-center justify-center gap-3 p-12 text-gray-500">
                        <RefreshCw size={20} className="animate-spin" />
                        Loading users...
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="px-6 py-14 text-center">
                        <UsersRound
                            size={36}
                            className="mx-auto text-gray-400"
                        />
                        <h3 className="mt-3 font-semibold text-gray-900">
                            No users found
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Try another search or role filter.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[650px] text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-5 py-3">User</th>
                                    <th className="px-5 py-3">Role</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Joined</th>
                                    <th className="px-5 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-semibold text-indigo-600">
                                                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {user.name || "Unnamed user"}
                                                    </p>
                                                    <p className="mt-1 flex items-center gap-1.5 text-gray-500">
                                                        <Mail size={14} />
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 capitalize text-gray-700">
                                            {user.role}
                                        </td>

                                        <td className="px-5 py-4">
                                            {user.role === "instructor"
                                                ? user.instructor_status || "Unknown"
                                                : "Active"}
                                        </td>

                                        <td className="px-5 py-4 text-gray-500">
                                            {user.created_at
                                                ? new Date(user.created_at).toLocaleDateString()
                                                : "—"}
                                        </td>

                                        <td className="px-5 py-4 text-right">
                                            {user.role === "student" ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(user)}
                                                    disabled={Boolean(processingId)}
                                                    title="Delete student"
                                                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                >
                                                    <Trash2 size={15} />
                                                    {processingId === user.id
                                                        ? "Removing..."
                                                        : "Remove"}
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400">
                                                    Manage separately
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
