
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../services/api";

export const fetchUsers = createAsyncThunk(
    "users/fetchUsers",
    async (role = "", { rejectWithValue }) => {
        try {
            const response = await api.get("/admin/users", {
                params: role ? { role } : {},
            });

            return response.data.users;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.error || "Failed to fetch users."
            );
        }
    }
);

export const deleteUser = createAsyncThunk(
    "users/deleteUser",
    async (userId, { rejectWithValue }) => {
        try {
            await api.delete(`/admin/users/${userId}`);
            return userId;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.error || "Failed to delete user."
            );
        }
    }
);

const usersSlice = createSlice({
    name: "users",
    initialState: {
        users: [],
        loading: false,
        processingId: null,
        error: null,
        successMessage: null,
    },
    reducers: {
        clearUserMessages(state) {
            state.error = null;
            state.successMessage = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUsers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.users = action.payload;
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(deleteUser.pending, (state, action) => {
                state.processingId = action.meta.arg;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(deleteUser.fulfilled, (state, action) => {
                state.processingId = null;
                state.users = state.users.filter(
                    (user) => user.id !== action.payload
                );
                state.successMessage = "User deleted successfully.";
            })
            .addCase(deleteUser.rejected, (state, action) => {
                state.processingId = null;
                state.error = action.payload;
            });
    },
});

export const { clearUserMessages } = usersSlice.actions;
export default usersSlice.reducer;
