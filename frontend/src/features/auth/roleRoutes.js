
export const roleRoutes = {
  admin: "/admin/dashboard",
  instructor: "/instructor/dashboard",
  student: "/student/dashboard",
};

export function getDashboardPath(role) {
  return roleRoutes[role] || "/login";
}
