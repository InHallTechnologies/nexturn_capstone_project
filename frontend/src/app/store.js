import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/authSlice";
import adminStatsReducer from "../features/admin/adminStatsSlice";
import instructorApplicationsReducer from "../features/admin/instructorApplicationsSlice";
import courseManagementReducer from
  "../features/admin/courseManagementSlice";
  import usersReducer from "../features/admin/usersSlice";

  import instructorAnalyticsReducer from
  "../features/instructor/instructorAnalyticsSlice";
  import myCoursesReducer from "../features/instructor/myCoursesSlice";
  import studentReducer from "../features/student/studentSlice";
  import studentLearningReducer from "../features/student/studentLearningSlice";
  import studentQuizReducer from "../features/student/studentQuizSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    adminStats: adminStatsReducer,
    instructorApplications: instructorApplicationsReducer,
    courseManagement: courseManagementReducer,
    users: usersReducer,
    instructorAnalytics: instructorAnalyticsReducer,
    myCourses: myCoursesReducer,
    student: studentReducer,
    studentLearning: studentLearningReducer,
    studentQuiz: studentQuizReducer,
  },
});