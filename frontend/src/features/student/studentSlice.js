import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  profile: null,
  internship: null,
  supervisors: {
    industry: null,
    institution: null,
  },
  loading: false,
  error: null,
};

const studentSlice = createSlice({
  name: 'student',
  initialState,
  reducers: {
    setProfile: (state, action) => { state.profile = action.payload; },
    setInternship: (state, action) => { state.internship = action.payload; },
    setSupervisors: (state, action) => { state.supervisors = action.payload; },
    updateProfileField: (state, action) => {
      state.profile = { ...state.profile, ...action.payload };
    },
    setLoading: (state, action) => { state.loading = action.payload; },
    setError: (state, action) => { state.error = action.payload; },
    clearError: (state) => { state.error = null; },
  },
});

export const {
  setProfile, setInternship, setSupervisors,
  updateProfileField, setLoading, setError, clearError,
} = studentSlice.actions;

export default studentSlice.reducer;

export const selectStudentProfile = (state) => state.student.profile;
export const selectInternship = (state) => state.student.internship;
export const selectSupervisors = (state) => state.student.supervisors;
