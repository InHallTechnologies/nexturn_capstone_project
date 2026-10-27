
import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import InstructorApplications from "./pages/admin/InstructorApplications";
import CourseManagement from "./pages/admin/CourseManagement";
import UserManagement from "./pages/admin/UserManagement";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import InstructorDashboard from "./pages/instructor/InstructorDashboard";
import StudentPerformance from "./pages/instructor/StudentPerformance";
import MyCourses from "./pages/instructor/MyCourses";
import CreateCourse from "./pages/instructor/CreateCourse";
import CourseDetails from "./pages/instructor/CourseDetails";
import CourseModules from "./pages/instructor/CourseModules";
import InstructorLayout from "./layouts/InstructorLayout";
import ModuleLessons from "./pages/instructor/ModuleLessons";
import QuizManagement from "./pages/instructor/quiz-management/QuizManagement"
import StudentPerformanceDetails from "./pages/instructor/StudentPerformanceDetails";
import StudentPerformanceCourses from "./pages/instructor/StudentPerformanceCourses";
import StudentLayout from "./layouts/StudentLayout";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentCourses from "./pages/student/StudentCourses";
import StudentLearning from "./pages/student/StudentLearning";
import StudentQuizzes from "./pages/student/StudentQuizzes";
import StudentQuizAttempt from "./pages/student/StudentQuizAttempt";
import StudentQuizHistory from "./pages/student/StudentQuizHistory";
import StudentQuizHistoryResult from "./pages/student/StudentQuizHistoryResult";
import StudentCertificates from "./pages/student/StudentCertificates";

import {
  checkSession,
  sessionInitialized,
} from "./features/auth/authSlice";

import { getDashboardPath } from "./features/auth/roleRoutes";

export default function App() {
  const dispatch = useDispatch();

  const {
    initialized,
    isAuthenticated,
    user,
  } = useSelector((state) => state.auth);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (token) {
      dispatch(checkSession());
    } else {
      dispatch(sessionInitialized());
    }
  }, [dispatch]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />

          <p className="text-sm font-medium text-slate-600">
            Verifying your session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public pages */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Admin section */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route
            index
            element={<Navigate to="dashboard" replace />}
          />

          <Route
            path="dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="instructors"
            element={<InstructorApplications />}
          />

          <Route
            path="courses"
            element={<CourseManagement />}
          />

          <Route
            path="users"
            element={<UserManagement />}
          />
        </Route>
      </Route>


      {/* Instructor section */}
      <Route element={<ProtectedRoute allowedRoles={["instructor"]} />}>
        <Route path="/instructor" element={<InstructorLayout />}>
          <Route
            index
            element={<Navigate to="dashboard" replace />}
          />

          <Route
            path="dashboard"
            element={<InstructorDashboard />}
          />

          <Route
            path="courses"
            element={<MyCourses />}
          />

          <Route
            path="courses/new"
            element={<CreateCourse />}
          />

          <Route
            path="courses/:courseId"
            element={<CourseDetails />}
          />

          <Route
            path="courses/:courseId/modules"
            element={<CourseModules />}
          />

          <Route
            path="courses/:courseId/students"
            element={<StudentPerformance />}
          />
          <Route
            path="courses/:courseId/students/:studentId"
            element={<StudentPerformanceDetails />}
          />
          <Route
            path="modules/:moduleId/lessons"
            element={<ModuleLessons />}
          />
          <Route
            path="courses/:courseId/quizzes"
            element={<QuizManagement />}
          />
          <Route
            path="students"
            element={<StudentPerformanceCourses />}
          />
        </Route>
      </Route>


      <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="courses" element={<StudentCourses />} />
          <Route
            path="courses/:courseId"
            element={<StudentLearning />}
          />
          <Route
            path="courses/:courseId/quizzes"
            element={<StudentQuizzes />}
          />
          <Route
            path="quizzes/:quizId"
            element={<StudentQuizAttempt />}
          />
          <Route path="quiz-history" element={<StudentQuizHistory />} />
          <Route
            path="quiz-attempts/:attemptId/result"
            element={<StudentQuizHistoryResult />}
          />
          <Route
            path="certificates"
            element={<StudentCertificates />}
          />
        </Route>
      </Route>

      {/* Default navigation */}
      <Route
        path="/"
        element={
          <Navigate
            to={
              isAuthenticated && user
                ? getDashboardPath(user.role)
                : "/login"
            }
            replace
          />
        }
      />

      {/* Unknown routes */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}
