
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

// Fetch all instructors, optionally filtered by status.
export const fetchInstructors = createAsyncThunk(
    "instructorApplications/fetchInstructors",
    async (status = "", { rejectWithValue }) => {
        try {
            const response = await api.get("/admin/instructors", {
                params: status ? { status } : {},
            });

            return response.data.instructors || [];
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Keep the existing pending-only thunk for compatibility.
export const fetchPendingInstructors = createAsyncThunk(
    "instructorApplications/fetchPending",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/admin/instructors/pending");
            return response.data.instructors || [];
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Approve an instructor.
export const approveInstructor = createAsyncThunk(
    "instructorApplications/approve",
    async (instructorId, { rejectWithValue }) => {
        try {
            const response = await api.patch(
                `/admin/instructors/${instructorId}/approve`
            );

            return {
                instructorId,
                message: response.data.message || "Instructor approved successfully.",
            };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Reject an instructor.
export const rejectInstructor = createAsyncThunk(
    "instructorApplications/reject",
    async (instructorId, { rejectWithValue }) => {
        try {
            const response = await api.patch(
                `/admin/instructors/${instructorId}/reject`
            );

            return {
                instructorId,
                message: response.data.message || "Instructor rejected successfully.",
            };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Remove an instructor.
export const deleteInstructor = createAsyncThunk(
    "instructorApplications/delete",
    async (instructorId, { rejectWithValue }) => {
        try {
            const response = await api.delete(
                `/admin/instructors/${instructorId}`
            );

            return {
                instructorId,
                message: response.data.message || "Instructor removed successfully.",
            };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

const initialState = {
    instructors: [],
    loading: false,
    processingId: null,
    error: null,
    successMessage: null,
};

const instructorApplicationsSlice = createSlice({
    name: "instructorApplications",
    initialState,

    reducers: {
        clearApplicationMessages(state) {
            state.error = null;
            state.successMessage = null;
        },
    },

    extraReducers: (builder) => {
        builder
            // Fetch all instructors.
            .addCase(fetchInstructors.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchInstructors.fulfilled, (state, action) => {
                state.loading = false;
                state.instructors = action.payload;
            })
            .addCase(fetchInstructors.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Unable to load instructors.";
            })

            // Fetch pending applications.
            .addCase(fetchPendingInstructors.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPendingInstructors.fulfilled, (state, action) => {
                state.loading = false;
                state.instructors = action.payload;
            })
            .addCase(fetchPendingInstructors.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Unable to load applications.";
            })

            // Approve instructor.
            .addCase(approveInstructor.pending, (state, action) => {
                state.processingId = action.meta.arg;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(approveInstructor.fulfilled, (state, action) => {
                state.processingId = null;

                state.instructors = state.instructors.map((instructor) =>
                    instructor.id === action.payload.instructorId
                        ? { ...instructor, instructor_status: "approved" }
                        : instructor
                );

                state.successMessage = action.payload.message;
            })
            .addCase(approveInstructor.rejected, (state, action) => {
                state.processingId = null;
                state.error = action.payload || "Unable to approve instructor.";
            })

            // Reject instructor.
            .addCase(rejectInstructor.pending, (state, action) => {
                state.processingId = action.meta.arg;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(rejectInstructor.fulfilled, (state, action) => {
                state.processingId = null;

                state.instructors = state.instructors.map((instructor) =>
                    instructor.id === action.payload.instructorId
                        ? { ...instructor, instructor_status: "rejected" }
                        : instructor
                );

                state.successMessage = action.payload.message;
            })
            .addCase(rejectInstructor.rejected, (state, action) => {
                state.processingId = null;
                state.error = action.payload || "Unable to reject instructor.";
            })

            // Delete instructor.
            .addCase(deleteInstructor.pending, (state, action) => {
                state.processingId = action.meta.arg;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(deleteInstructor.fulfilled, (state, action) => {
                state.processingId = null;

                state.instructors = state.instructors.filter(
                    (instructor) => instructor.id !== action.payload.instructorId
                );

                state.successMessage = action.payload.message;
            })
            .addCase(deleteInstructor.rejected, (state, action) => {
                state.processingId = null;
                state.error = action.payload || "Unable to remove instructor.";
            });
    },
});

export const { clearApplicationMessages } =
    instructorApplicationsSlice.actions;

export default instructorApplicationsSlice.reducer;
