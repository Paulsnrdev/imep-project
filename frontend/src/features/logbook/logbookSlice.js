import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  weeks: [],
  currentWeek: null,
  activeWeekId: null,
  entries: {},
  loading: false,
  submitting: false,
  error: null,
};

const logbookSlice = createSlice({
  name: 'logbook',
  initialState,
  reducers: {
    setWeeks: (state, action) => {
      state.weeks = action.payload;
    },
    setCurrentWeek: (state, action) => {
      state.currentWeek = action.payload;
    },
    setActiveWeekId: (state, action) => {
      state.activeWeekId = action.payload;
    },
    setEntries: (state, action) => {
      const { weekId, entries } = action.payload;
      state.entries[weekId] = entries;
    },
    upsertEntry: (state, action) => {
      const { weekId, entry } = action.payload;
      if (!state.entries[weekId]) state.entries[weekId] = [];
      const idx = state.entries[weekId].findIndex((e) => e._id === entry._id);
      if (idx >= 0) state.entries[weekId][idx] = entry;
      else state.entries[weekId].push(entry);
    },
    lockWeek: (state, action) => {
      const week = state.weeks.find((w) => w._id === action.payload);
      if (week) week.isLocked = true;
    },
    setLoading: (state, action) => { state.loading = action.payload; },
    setSubmitting: (state, action) => { state.submitting = action.payload; },
    setError: (state, action) => { state.error = action.payload; },
    clearError: (state) => { state.error = null; },
  },
});

export const {
  setWeeks, setCurrentWeek, setActiveWeekId, setEntries,
  upsertEntry, lockWeek, setLoading, setSubmitting, setError, clearError,
} = logbookSlice.actions;

export default logbookSlice.reducer;

export const selectWeeks = (state) => state.logbook.weeks;
export const selectCurrentWeek = (state) => state.logbook.currentWeek;
export const selectActiveWeekId = (state) => state.logbook.activeWeekId;
export const selectEntriesByWeek = (weekId) => (state) => state.logbook.entries[weekId] ?? [];
export const selectLogbookLoading = (state) => state.logbook.loading;
