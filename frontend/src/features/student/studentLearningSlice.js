
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../services/api";

export const fetchStudentCourseContent = createAsyncThunk(
  "studentLearning/fetchCourseContent",
  async (courseId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(
        `/student/courses/${courseId}/modules`
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to load course content."
      );
    }
  }
);

const studentLearningSlice = createSlice({
  name: "studentLearning",
  initialState: {
    course: null,
    modules: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearStudentLearning(state) {
      state.course = null;
      state.modules = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudentCourseContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentCourseContent.fulfilled, (state, action) => {
        state.loading = false;
        state.course = action.payload.course;
        state.modules = action.payload.modules || [];
      })
      .addCase(fetchStudentCourseContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load course content.";
      });
  },
});

export const { clearStudentLearning } = studentLearningSlice.actions;
export default studentLearningSlice.reducer;
