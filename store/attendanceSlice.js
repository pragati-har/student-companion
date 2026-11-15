import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ─── Async Thunks ──────────────────────────────────────────────────────────

export const fetchAttendance = createAsyncThunk(
  'attendance/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/api/attendance?${qs}`);
    const data = await res.json();
    if (!res.ok) return rejectWithValue(data.message);
    return { items: data.data, pagination: data.pagination };
  }
);

export const fetchAttendanceSummary = createAsyncThunk(
  'attendance/fetchSummary',
  async (_, { rejectWithValue }) => {
    const res = await fetch('/api/attendance/summary');
    const data = await res.json();
    if (!res.ok) return rejectWithValue(data.message);
    return data.data;
  }
);

export const saveAttendance = createAsyncThunk(
  'attendance/save',
  async (payload, { rejectWithValue }) => {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return rejectWithValue(data.message);
    return data.data;
  }
);

// ─── Slice ─────────────────────────────────────────────────────────────────

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
    items:          [],
    pagination:     null,
    summary:        null,   // { subjects: [...], overallPresent, overallTotal, overallPercent }
    loading:        false,
    summaryLoading: false,
    error:          null,
  },
  reducers: {
    // Socket.IO real-time
    attendanceUpdated: (state, action) => {
      const idx = state.items.findIndex(
        r => r.subjectId?._id === action.payload.subjectId?._id && r.date === action.payload.date
      );
      if (idx !== -1) state.items[idx] = action.payload;
      else state.items.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendance.pending,    (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchAttendance.fulfilled,  (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAttendance.rejected,   (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchAttendanceSummary.pending,    (state) => { state.summaryLoading = true; })
      .addCase(fetchAttendanceSummary.fulfilled,  (state, action) => { state.summaryLoading = false; state.summary = action.payload; })
      .addCase(fetchAttendanceSummary.rejected,   (state) => { state.summaryLoading = false; })
      .addCase(saveAttendance.fulfilled,   (state, action) => {
        const idx = state.items.findIndex(
          r => r._id === action.payload._id
        );
        if (idx !== -1) state.items[idx] = action.payload;
        else state.items.unshift(action.payload);
      })
      .addCase(saveAttendance.rejected, (state, action) => { state.error = action.payload; });
  },
});

export const { attendanceUpdated } = attendanceSlice.actions;
export default attendanceSlice.reducer;
