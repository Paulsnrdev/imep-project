import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import logbookReducer from '../features/logbook/logbookSlice';
import attendanceReducer from '../features/attendance/attendanceSlice';
import gradingReducer from '../features/grading/gradingSlice';
import messagingReducer from '../features/messaging/messagingSlice';
import notificationReducer from '../features/notifications/notificationSlice';
import studentReducer from '../features/student/studentSlice';
import uiReducer from '../features/ui/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    logbook: logbookReducer,
    attendance: attendanceReducer,
    grading: gradingReducer,
    messaging: messagingReducer,
    notifications: notificationReducer,
    student: studentReducer,
    ui: uiReducer,
  },
});
