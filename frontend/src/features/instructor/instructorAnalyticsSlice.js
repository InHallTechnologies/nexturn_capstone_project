
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../services/api";

export const fetchInstructorAnalytics = createAsyncThunk(
  "instructorAnalytics/fetchAnalytics",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/instructor/analytics");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Failed to load instructor analytics."
      );
    }
  }
);

const initialState = {
  data: null,
  loading: false,
  error: null,
};

const instructorAnalyticsSlice = createSlice({
  name: "instructorAnalytics",
  initialState,
  reducers: {
    clearInstructorAnalyticsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInstructorAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInstructorAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchInstructorAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Failed to load instructor analytics.";
      });
  },
});

export const { clearInstructorAnalyticsError } =
  instructorAnalyticsSlice.actions;

export default instructorAnalyticsSlice.reducer;
