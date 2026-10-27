
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../services/api";

const getErrorMessage = (error, fallback) =>
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.message ||
    fallback;

export const fetchPublishedCourses = createAsyncThunk(
    "student/fetchPublishedCourses",
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get("/courses");
            return data.courses || [];
        } catch (error) {
            return rejectWithValue(
                getErrorMessage(error, "Failed to load courses.")
            );
        }
    }
);

export const fetchMyEnrollments = createAsyncThunk(
    "student/fetchMyEnrollments",
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get("/enrollments");
            return data.enrollments || [];
        } catch (error) {
            return rejectWithValue(
                getErrorMessage(error, "Failed to load your enrollments.")
            );
        }
    }
);

export const enrollInCourse = createAsyncThunk(
    "student/enrollInCourse",
    async (courseId, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`/enrollments/${courseId}`);
            return { ...data.enrollment, message: data.message };
        } catch (error) {
            return rejectWithValue(
                getErrorMessage(error, "Enrollment failed.")
            );
        }
    }
);

export const fetchCourseProgress = createAsyncThunk(
    "student/fetchCourseProgress",
    async (courseId, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/progress/courses/${courseId}`);
            return data;
        } catch (error) {
            return rejectWithValue({
                courseId,
                message: getErrorMessage(
                    error,
                    "Failed to load course progress."
                ),
            });
        }
    }
);

const studentSlice = createSlice({
    name: "student",
    initialState: {
        courses: [],
        enrollments: [],
        progressByCourse: {},
        coursesLoading: false,
        enrollmentsLoading: false,
        enrollingCourseId: null,
        coursesError: null,
        enrollmentsError: null,
        enrollmentError: null,
        progressLoading: {},
    },
    reducers: {
        clearStudentErrors(state) {
            state.coursesError = null;
            state.enrollmentsError = null;
            state.enrollmentError = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPublishedCourses.pending, (state) => {
                state.coursesLoading = true;
                state.coursesError = null;
            })
            .addCase(fetchPublishedCourses.fulfilled, (state, action) => {
                state.coursesLoading = false;
                state.courses = action.payload;
            })
            .addCase(fetchPublishedCourses.rejected, (state, action) => {
                state.coursesLoading = false;
                state.coursesError = action.payload || "Failed to load courses.";
            })

            .addCase(fetchMyEnrollments.pending, (state) => {
                state.enrollmentsLoading = true;
                state.enrollmentsError = null;
            })
            .addCase(fetchMyEnrollments.fulfilled, (state, action) => {
                state.enrollmentsLoading = false;
                state.enrollments = action.payload;
            })
            .addCase(fetchMyEnrollments.rejected, (state, action) => {
                state.enrollmentsLoading = false;
                state.enrollmentsError =
                    action.payload || "Failed to load enrollments.";
            })

            .addCase(enrollInCourse.pending, (state, action) => {
                state.enrollingCourseId = action.meta.arg;
                state.enrollmentError = null;
            })
            .addCase(enrollInCourse.fulfilled, (state, action) => {
                state.enrollingCourseId = null;

                const existing = state.enrollments.findIndex(
                    (item) => item.course_id === action.payload.course_id
                );

                if (existing >= 0) {
                    state.enrollments[existing] = action.payload;
                } else {
                    state.enrollments.unshift(action.payload);
                }
            })
            .addCase(enrollInCourse.rejected, (state, action) => {
                state.enrollingCourseId = null;
                state.enrollmentError =
                    action.payload || "Enrollment failed.";
            })

            .addCase(fetchCourseProgress.pending, (state, action) => {
                state.progressLoading[action.meta.arg] = true;
            })
            .addCase(fetchCourseProgress.fulfilled, (state, action) => {
                state.progressLoading[action.payload.course_id] = false;
                state.progressByCourse[action.payload.course_id] =
                    action.payload;
            })
            .addCase(fetchCourseProgress.rejected, (state, action) => {
                const payload = action.payload;
                if (payload?.courseId) {
                    state.progressLoading[payload.courseId] = false;
                }
            });
    },
});

export const { clearStudentErrors } = studentSlice.actions;
export default studentSlice.reducer;
