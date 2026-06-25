import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  todayRecord: null,
  history: [],
  summary: null,
  geofenceStatus: null,
  checkingIn: false,
  checkingOut: false,
  loading: false,
  error: null,
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    setTodayRecord: (state, action) => { state.todayRecord = action.payload; },
    setHistory: (state, action) => { state.history = action.payload; },
    setSummary: (state, action) => { state.summary = action.payload; },
    setGeofenceStatus: (state, action) => { state.geofenceStatus = action.payload; },
    setCheckingIn: (state, action) => { state.checkingIn = action.payload; },
    setCheckingOut: (state, action) => { state.checkingOut = action.payload; },
    setLoading: (state, action) => { state.loading = action.payload; },
    setError: (state, action) => { state.error = action.payload; },
    clearError: (state) => { state.error = null; },
  },
});

export const {
  setTodayRecord, setHistory, setSummary, setGeofenceStatus,
  setCheckingIn, setCheckingOut, setLoading, setError, clearError,
} = attendanceSlice.actions;

export default attendanceSlice.reducer;

export const selectTodayRecord = (state) => state.attendance.todayRecord;
export const selectAttendanceSummary = (state) => state.attendance.summary;
export const selectGeofenceStatus = (state) => state.attendance.geofenceStatus;
export const selectCheckingIn = (state) => state.attendance.checkingIn;
export const selectCheckingOut = (state) => state.attendance.checkingOut;
