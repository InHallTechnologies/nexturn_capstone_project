
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../services/api";

export const fetchMyCourses = createAsyncThunk(
  "myCourses/fetchMyCourses",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/courses/my");
      return response.data.courses;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch your courses."
      );
    }
  }
);

const myCoursesSlice = createSlice({
  name: "myCourses",
  initialState: {
    courses: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearMyCoursesError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyCourses.fulfilled, (state, action) => {
        state.loading = false;
        state.courses = action.payload;
      })
      .addCase(fetchMyCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Something went wrong.";
      });
  },
});

export const { clearMyCoursesError } = myCoursesSlice.actions;
export default myCoursesSlice.reducer;
