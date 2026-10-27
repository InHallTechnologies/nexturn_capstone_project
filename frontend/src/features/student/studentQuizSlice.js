
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../services/api";

// Fetch published quizzes for a course
export const fetchCourseQuizzes = createAsyncThunk(
  "studentQuiz/fetchCourseQuizzes",
  async (courseId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/courses/${courseId}/quizzes`);
      return {
        courseId,
        quizzes: data.quizzes || [],
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to load quizzes."
      );
    }
  }
);

// Start a quiz attempt or resume an existing in-progress attempt
export const startQuizAttempt = createAsyncThunk(
  "studentQuiz/startAttempt",
  async (quizId, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/courses/${quizId}/attempts`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to start quiz."
      );
    }
  }
);

// Fetch questions for an attempt
export const fetchAttemptQuestions = createAsyncThunk(
  "studentQuiz/fetchAttemptQuestions",
  async (attemptId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/attempts/${attemptId}/questions`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to load quiz questions."
      );
    }
  }
);

// Submit answers for an attempt
export const submitQuizAttempt = createAsyncThunk(
  "studentQuiz/submitAttempt",
  async ({ attemptId, answers }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/attempts/${attemptId}/submit`, {
        answers,
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to submit quiz."
      );
    }
  }
);

// Fetch the result for one attempt
export const fetchAttemptResult = createAsyncThunk(
  "studentQuiz/fetchAttemptResult",
  async (attemptId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/attempts/${attemptId}/result`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to load quiz result."
      );
    }
  }
);

// Fetch the current student's quiz attempt history
// Requires the backend endpoint: GET /attempts/history
export const fetchStudentQuizHistory = createAsyncThunk(
  "studentQuiz/fetchStudentQuizHistory",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/attempts/history");
      return data.attempts || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to load quiz history."
      );
    }
  }
);

const initialState = {
  // Published quizzes, grouped by course ID
  quizzesByCourse: {},

  // Current attempt
  attempt: null,
  questions: [],
  deadline: null,
  answers: {},
  result: null,

  // Quiz history
  history: [],

  // Loading states
  loading: false,
  submitting: false,
  historyLoading: false,

  // Error states
  error: null,
  historyError: null,
};

const studentQuizSlice = createSlice({
  name: "studentQuiz",
  initialState,

  reducers: {
    clearQuizError: (state) => {
      state.error = null;
      state.historyError = null;
    },

    // Save a student's answer locally in Redux
    setQuizAnswer: (state, action) => {
      const { questionId, answer } = action.payload;
      state.answers[questionId] = answer;
    },

    // Clear the current attempt's data
    clearCurrentAttempt: (state) => {
      state.attempt = null;
      state.questions = [];
      state.deadline = null;
      state.answers = {};
      state.result = null;
      state.error = null;
      state.loading = false;
      state.submitting = false;
    },

    // Clear history errors when leaving or reloading the history page
    clearHistoryError: (state) => {
      state.historyError = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // Fetch course quizzes
      .addCase(fetchCourseQuizzes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourseQuizzes.fulfilled, (state, action) => {
        state.loading = false;

        const { courseId, quizzes } = action.payload;
        state.quizzesByCourse[courseId] = quizzes;
      })
      .addCase(fetchCourseQuizzes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load quizzes.";
      })

      // Start or resume attempt
      .addCase(startQuizAttempt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startQuizAttempt.fulfilled, (state, action) => {
        state.loading = false;

        // Support APIs that return either { attempt: {...} }
        // or the attempt object directly.
        const attempt = action.payload.attempt || action.payload;

        state.attempt = attempt;
        state.deadline = attempt.deadline || null;

        // Do not erase existing answers here unnecessarily.
        // The questions endpoint does not provide saved answers.
        if (!state.answers) {
          state.answers = {};
        }
      })
      .addCase(startQuizAttempt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to start quiz.";
      })

      // Fetch attempt questions
      .addCase(fetchAttemptQuestions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttemptQuestions.fulfilled, (state, action) => {
        state.loading = false;

        state.questions = action.payload.questions || [];
        state.deadline = action.payload.deadline || state.deadline;
      })
      .addCase(fetchAttemptQuestions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load quiz questions.";
      })

      // Submit attempt
      .addCase(submitQuizAttempt.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitQuizAttempt.fulfilled, (state, action) => {
        state.submitting = false;
        state.result = action.payload;

        // Refresh history on the history page to show the new result.
        // The page can also explicitly dispatch fetchStudentQuizHistory.
      })
      .addCase(submitQuizAttempt.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || "Failed to submit quiz.";
      })

      // Fetch one attempt's result
      .addCase(fetchAttemptResult.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttemptResult.fulfilled, (state, action) => {
        state.loading = false;
        state.result = action.payload;
      })
      .addCase(fetchAttemptResult.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load quiz result.";
      })

      // Fetch student quiz history
      .addCase(fetchStudentQuizHistory.pending, (state) => {
        state.historyLoading = true;
        state.historyError = null;
      })
      .addCase(fetchStudentQuizHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.history = action.payload;
      })
      .addCase(fetchStudentQuizHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.historyError =
          action.payload || "Failed to load quiz history.";
      });
  },
});

export const {
  clearQuizError,
  setQuizAnswer,
  clearCurrentAttempt,
  clearHistoryError,
} = studentQuizSlice.actions;

export default studentQuizSlice.reducer;
