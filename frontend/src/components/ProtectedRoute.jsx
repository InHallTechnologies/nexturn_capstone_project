
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { getDashboardPath } from "../features/auth/roleRoutes";

export default function ProtectedRoute({ allowedRoles }) {
    const { isAuthenticated, user } = useSelector(
        (state) => state.auth
    );

    const location = useLocation();

    if (!isAuthenticated || !user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    if (!allowedRoles.includes(user.role)) {
        return (
            <Navigate
                to={getDashboardPath(user.role)}
                replace
            />
        );
    }

    return <Outlet />;
}
