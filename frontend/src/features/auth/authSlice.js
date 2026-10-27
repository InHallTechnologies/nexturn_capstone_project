
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../services/api";

const getStoredUser = () => {
    try {
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
};

const clearStoredSession = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
};

function getErrorMessage(error, fallback) {
    return (
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        fallback
    );
}

// Login
export const loginUser = createAsyncThunk(
    "auth/login",
    async (credentials, { rejectWithValue }) => {
        try {
            const { data } = await api.post("/auth/login", credentials);

            if (
                !data.access_token ||
                !data.refresh_token ||
                !data.user
            ) {
                return rejectWithValue(
                    "Invalid login response from server."
                );
            }

            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("refresh_token", data.refresh_token);
            localStorage.setItem("user", JSON.stringify(data.user));

            return data;
        } catch (error) {
            return rejectWithValue(
                getErrorMessage(
                    error,
                    "Login failed. Please check your credentials."
                )
            );
        }
    }
);

// Student registration
export const registerUser = createAsyncThunk(
    "auth/register",
    async (userData, { rejectWithValue }) => {
        try {
            const { data } = await api.post(
                "/auth/register",
                userData
            );

            return data;
        } catch (error) {
            return rejectWithValue(
                getErrorMessage(error, "Registration failed.")
            );
        }
    }
);

// Instructor registration/application
export const instructorRegister = createAsyncThunk(
    "auth/instructorRegister",
    async (userData, { rejectWithValue }) => {
        try {
            const { data } = await api.post(
                "/auth/instructor-register",
                userData
            );

            return data;
        } catch (error) {
            return rejectWithValue(
                getErrorMessage(
                    error,
                    "Instructor application failed."
                )
            );
        }
    }
);

// Validate the existing session with Flask
export const checkSession = createAsyncThunk(
    "auth/checkSession",
    async (_, { rejectWithValue }) => {
        const token = localStorage.getItem("access_token");

        if (!token) {
            return rejectWithValue("No access token found.");
        }

        try {
            const { data } = await api.get("/auth/me");

            // Supports either { user: {...} } or a direct user object.
            const user = data.user || data;

            if (!user || !user.role || !user.email) {
                return rejectWithValue("Invalid user response.");
            }

            localStorage.setItem("user", JSON.stringify(user));

            return user;
        } catch (error) {
            return rejectWithValue(
                getErrorMessage(
                    error,
                    "Session expired or invalid."
                )
            );
        }
    }
);

const authSlice = createSlice({
    name: "auth",

    initialState: {
        user: getStoredUser(),
        accessToken: localStorage.getItem("access_token"),
        isAuthenticated: false,
        initialized: false,
        loading: false,
        error: null,
    },

    reducers: {
        logout(state) {
            state.user = null;
            state.accessToken = null;
            state.isAuthenticated = false;
            state.error = null;

            clearStoredSession();
        },

        clearAuthError(state) {
            state.error = null;
        },

        sessionInitialized(state) {
            state.initialized = true;
        },
    },

    extraReducers: (builder) => {
        builder
            // Login
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.accessToken = action.payload.access_token;
                state.isAuthenticated = true;
                state.initialized = true;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    action.payload || "Login failed.";
            })

            // Student registration
            .addCase(registerUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    action.payload || "Registration failed.";
            })

            // Instructor registration
            .addCase(instructorRegister.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(instructorRegister.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(instructorRegister.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    action.payload ||
                    "Instructor application failed.";
            })

            // Session validation
            .addCase(checkSession.pending, (state) => {
                state.initialized = false;
            })
            .addCase(checkSession.fulfilled, (state, action) => {
                state.user = action.payload;
                state.accessToken =
                    localStorage.getItem("access_token");
                state.isAuthenticated = true;
                state.initialized = true;
            })
            .addCase(checkSession.rejected, (state) => {
                state.user = null;
                state.accessToken = null;
                state.isAuthenticated = false;
                state.initialized = true;

                clearStoredSession();
            });
    },
});

export const {
    logout,
    clearAuthError,
    sessionInitialized,
} = authSlice.actions;

export default authSlice.reducer;
