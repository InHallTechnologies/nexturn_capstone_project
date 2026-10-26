import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppShell from "./layout/AppShell";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import ClientsPage from "../pages/freelancer/ClientsPage";
import ProjectsPage from "../pages/freelancer/ProjectsPage";
import TimesheetPage from "../pages/freelancer/TimesheetPage";
import InvoicesPage from "../pages/freelancer/InvoicesPage";
import PaymentsPage from "../pages/freelancer/PaymentsPage";
import PortalPage from "../pages/portal/PortalPage";
import ProjectPostsPage from "../pages/portal/ProjectPostsPage";
import ProjectBoardPage from "../pages/freelancer/ProjectBoardPage";
import InvoiceDetailPage from "../pages/common/InvoiceDetailPage";
import InvoiceBuilderPage from "../pages/freelancer/InvoiceBuilderPage";
import WorkReviewPage from "../pages/portal/WorkReviewPage";
import HomePage from "../pages/HomePage";
import "../styles/app.css";

function homeForRole(role) {
  return role === "client" ? "/portal" : "/dashboard";
}

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return children;
}

function WorkspaceRoute({ children, role = "freelancer" }) {
  return (
    <ProtectedRoute role={role}>
      <AppShell portal={role === "client"}>{children}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={homeForRole(user.role)} replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to={homeForRole(user.role)} replace />
          ) : (
            <RegisterPage />
          )
        }
      />
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={homeForRole(user.role)} replace />
          ) : (
            <HomePage />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          <WorkspaceRoute>
            <DashboardPage />
          </WorkspaceRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <WorkspaceRoute>
            <ClientsPage />
          </WorkspaceRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <WorkspaceRoute>
            <ProjectsPage />
          </WorkspaceRoute>
        }
      />
      <Route
        path="/project-board"
        element={
          <WorkspaceRoute>
            <ProjectBoardPage />
          </WorkspaceRoute>
        }
      />
      <Route
        path="/time"
        element={
          <WorkspaceRoute>
            <TimesheetPage />
          </WorkspaceRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <WorkspaceRoute>
            <InvoicesPage />
          </WorkspaceRoute>
        }
      />
      <Route
        path="/invoices/:id"
        element={
          <WorkspaceRoute>
            <InvoiceDetailPage />
          </WorkspaceRoute>
        }
      />
      <Route
        path="/invoices/new"
        element={
          <WorkspaceRoute>
            <InvoiceBuilderPage />
          </WorkspaceRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <WorkspaceRoute>
            <PaymentsPage />
          </WorkspaceRoute>
        }
      />
      <Route
        path="/portal"
        element={
          <WorkspaceRoute role="client">
            <PortalPage />
          </WorkspaceRoute>
        }
      />
      <Route
        path="/portal/invoices/:id"
        element={
          <WorkspaceRoute role="client">
            <InvoiceDetailPage portal />
          </WorkspaceRoute>
        }
      />
      <Route
        path="/portal/work"
        element={
          <WorkspaceRoute role="client">
            <WorkReviewPage />
          </WorkspaceRoute>
        }
      />
      <Route
        path="/portal/projects"
        element={
          <WorkspaceRoute role="client">
            <ProjectPostsPage />
          </WorkspaceRoute>
        }
      />
      <Route
        path="/portal/payments"
        element={
          <WorkspaceRoute role="client">
            <PaymentsPage portal />
          </WorkspaceRoute>
        }
      />
      <Route
        path="*"
        element={
          <Navigate
            to={user ? homeForRole(user.role) : "/"}
            replace
          />
        }
      />
    </Routes>
  );
}
