import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  myGrades: [],
  studentGrades: {},
  leaderboard: [],
  submitting: false,
  loading: false,
  error: null,
};

const gradingSlice = createSlice({
  name: 'grading',
  initialState,
  reducers: {
    setMyGrades: (state, action) => { state.myGrades = action.payload; },
    upsertGrade: (state, action) => {
      const grade = action.payload;
      const idx = state.myGrades.findIndex((g) => g._id === grade._id);
      if (idx >= 0) state.myGrades[idx] = grade;
      else state.myGrades.push(grade);
    },
    setStudentGrades: (state, action) => {
      const { studentId, grades } = action.payload;
      state.studentGrades[studentId] = grades;
    },
    setLeaderboard: (state, action) => { state.leaderboard = action.payload; },
    setSubmitting: (state, action) => { state.submitting = action.payload; },
    setLoading: (state, action) => { state.loading = action.payload; },
    setError: (state, action) => { state.error = action.payload; },
    clearError: (state) => { state.error = null; },
  },
});

export const {
  setMyGrades, upsertGrade, setStudentGrades, setLeaderboard,
  setSubmitting, setLoading, setError, clearError,
} = gradingSlice.actions;

export default gradingSlice.reducer;

export const selectMyGrades = (state) => state.grading.myGrades;
export const selectLeaderboard = (state) => state.grading.leaderboard;
export const selectStudentGrades = (studentId) => (state) => state.grading.studentGrades[studentId] ?? [];
