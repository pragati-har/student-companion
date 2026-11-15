import { configureStore } from '@reduxjs/toolkit';
import subjectsReducer    from './subjectsSlice';
import assignmentsReducer from './assignmentsSlice';
import attendanceReducer  from './attendanceSlice';

export const store = configureStore({
  reducer: {
    subjects:    subjectsReducer,
    assignments: assignmentsReducer,
    attendance:  attendanceReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});
