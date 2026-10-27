
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../services/api";

export const fetchAdminStats = createAsyncThunk(
  "adminStats/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin/stats");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to load dashboard statistics."
      );
    }
  }
);

const adminStatsSlice = createSlice({
  name: "adminStats",

  initialState: {
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  },

  reducers: {
    clearAdminStatsError(state) {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminStats.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchAdminStats.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Unable to load dashboard statistics.";
      });
  },
});

export const { clearAdminStatsError } = adminStatsSlice.actions;

export default adminStatsSlice.reducer;
