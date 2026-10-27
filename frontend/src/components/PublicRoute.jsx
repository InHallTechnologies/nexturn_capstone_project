
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { getDashboardPath } from "../features/auth/roleRoutes";

export default function PublicRoute() {
    const { isAuthenticated, user } = useSelector(
        (state) => state.auth
    );

    if (isAuthenticated && user) {
        return (
            <Navigate
                to={getDashboardPath(user.role)}
                replace
            />
        );
    }

    return <Outlet />;
}
