
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../services/api";

function getErrorMessage(error) {
    return (
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Something went wrong. Please try again."
    );
}

// Fetch all courses or filter by status.
export const fetchCourses = createAsyncThunk(
    "courseManagement/fetchCourses",
    async (status = "", { rejectWithValue }) => {
        try {
            const response = await api.get("/admin/courses", {
                params:
                    status && status !== "all"
                        ? { status }
                        : {},
            });

            return response.data.courses || [];
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Approve a course that is pending review.
export const approveCourse = createAsyncThunk(
    "courseManagement/approveCourse",
    async (courseId, { rejectWithValue }) => {
        try {
            const response = await api.patch(
                `/admin/courses/${courseId}/approve`
            );

            return {
                courseId,
                status: response.data.course?.status || "approved",
                message:
                    response.data.message ||
                    "Course approved successfully.",
            };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Publish an approved course.
export const publishCourse = createAsyncThunk(
    "courseManagement/publishCourse",
    async (courseId, { rejectWithValue }) => {
        try {
            const response = await api.patch(
                `/admin/courses/${courseId}/publish`
            );

            return {
                courseId,
                status: response.data.course?.status || "published",
                message:
                    response.data.message ||
                    "Course published successfully.",
            };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Unpublish a published course and move it back to draft.
export const unpublishCourse = createAsyncThunk(
    "courseManagement/unpublishCourse",
    async (courseId, { rejectWithValue }) => {
        try {
            const response = await api.patch(
                `/admin/courses/${courseId}/unpublish`
            );

            return {
                courseId,
                status: response.data.course?.status || "draft",
                message:
                    response.data.message ||
                    "Course unpublished successfully.",
            };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Reject a course pending review and return it to draft.
export const rejectCourse = createAsyncThunk(
    "courseManagement/rejectCourse",
    async ({ courseId, reason }, { rejectWithValue }) => {
        try {
            const response = await api.patch(
                `/admin/courses/${courseId}/reject`,
                { reason }
            );

            return {
                courseId,
                status: response.data.course?.status || "draft",
                rejection_reason:
                    response.data.course?.rejection_reason || reason,
                message:
                    response.data.message ||
                    "Course rejected and moved to draft.",
            };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Delete a course.
export const deleteCourse = createAsyncThunk(
    "courseManagement/deleteCourse",
    async (courseId, { rejectWithValue }) => {
        try {
            const response = await api.delete(
                `/admin/courses/${courseId}`
            );

            return {
                courseId,
                message:
                    response.data.message ||
                    "Course deleted successfully.",
            };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

const initialState = {
    courses: [],
    loading: false,
    processingId: null,
    error: null,
    successMessage: null,
};

const courseManagementSlice = createSlice({
    name: "courseManagement",
    initialState,

    reducers: {
        clearCourseMessages(state) {
            state.error = null;
            state.successMessage = null;
        },
    },

    extraReducers: (builder) => {
        builder
            // Fetch courses
            .addCase(fetchCourses.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCourses.fulfilled, (state, action) => {
                state.loading = false;
                state.courses = action.payload;
                state.error = null;
            })
            .addCase(fetchCourses.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    action.payload || "Failed to fetch courses.";
            })

            // Approve course
            .addCase(approveCourse.pending, (state, action) => {
                state.processingId = action.meta.arg;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(approveCourse.fulfilled, (state, action) => {
                state.processingId = null;

                const { courseId, status, message } = action.payload;

                state.courses = state.courses.map((course) =>
                    course.id === courseId
                        ? { ...course, status }
                        : course
                );

                state.successMessage = message;
            })
            .addCase(approveCourse.rejected, (state, action) => {
                state.processingId = null;
                state.error =
                    action.payload || "Failed to approve course.";
            })

            // Publish course
            .addCase(publishCourse.pending, (state, action) => {
                state.processingId = action.meta.arg;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(publishCourse.fulfilled, (state, action) => {
                state.processingId = null;

                const { courseId, status, message } = action.payload;

                state.courses = state.courses.map((course) =>
                    course.id === courseId
                        ? { ...course, status }
                        : course
                );

                state.successMessage = message;
            })
            .addCase(publishCourse.rejected, (state, action) => {
                state.processingId = null;
                state.error =
                    action.payload || "Failed to publish course.";
            })

            // Unpublish course
            .addCase(unpublishCourse.pending, (state, action) => {
                state.processingId = action.meta.arg;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(unpublishCourse.fulfilled, (state, action) => {
                state.processingId = null;

                const { courseId, status, message } = action.payload;

                state.courses = state.courses.map((course) =>
                    course.id === courseId
                        ? { ...course, status }
                        : course
                );

                state.successMessage = message;
            })
            .addCase(unpublishCourse.rejected, (state, action) => {
                state.processingId = null;
                state.error =
                    action.payload || "Failed to unpublish course.";
            })

            // Reject course
            .addCase(rejectCourse.pending, (state, action) => {
                state.processingId = action.meta.arg.courseId;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(rejectCourse.fulfilled, (state, action) => {
                state.processingId = null;

                const {
                    courseId,
                    status,
                    rejection_reason,
                    message,
                } = action.payload;

                state.courses = state.courses.map((course) =>
                    course.id === courseId
                        ? { ...course, status, rejection_reason }
                        : course
                );

                state.successMessage = message;
            })
            .addCase(rejectCourse.rejected, (state, action) => {
                state.processingId = null;
                state.error =
                    action.payload || "Failed to reject course.";
            })

            // Delete course
            .addCase(deleteCourse.pending, (state, action) => {
                state.processingId = action.meta.arg;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(deleteCourse.fulfilled, (state, action) => {
                state.processingId = null;

                state.courses = state.courses.filter(
                    (course) => course.id !== action.payload.courseId
                );

                state.successMessage = action.payload.message;
            })
            .addCase(deleteCourse.rejected, (state, action) => {
                state.processingId = null;
                state.error =
                    action.payload || "Failed to delete course.";
            });
    },
});

export const { clearCourseMessages } = courseManagementSlice.actions;

export default courseManagementSlice.reducer;
