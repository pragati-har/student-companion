import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ─── Async Thunks ──────────────────────────────────────────────────────────

export const fetchAssignments = createAsyncThunk(
  'assignments/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/api/assignments?${qs}`);
    const data = await res.json();
    if (!res.ok) return rejectWithValue(data.message);
    return { items: data.data, pagination: data.pagination };
  }
);

export const createAssignment = createAsyncThunk('assignments/create', async (payload, { rejectWithValue }) => {
  const res = await fetch('/api/assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) return rejectWithValue(data.message);
  return data.data;
});

export const updateAssignment = createAsyncThunk('assignments/update', async ({ id, ...payload }, { rejectWithValue }) => {
  const res = await fetch(`/api/assignments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) return rejectWithValue(data.message);
  return data.data;
});

export const deleteAssignment = createAsyncThunk('assignments/delete', async (id, { rejectWithValue }) => {
  const res = await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) return rejectWithValue(data.message);
  return id;
});

export const completeAssignment = createAsyncThunk('assignments/complete', async (id, { rejectWithValue }) => {
  const res = await fetch(`/api/assignments/${id}/complete`, { method: 'PATCH' });
  const data = await res.json();
  if (!res.ok) return rejectWithValue(data.message);
  return data.data;
});

export const toggleReminder = createAsyncThunk('assignments/toggleReminder', async ({ id, remindMe }, { rejectWithValue }) => {
  const res = await fetch(`/api/assignments/${id}/remind`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ remindMe }),
  });
  const data = await res.json();
  if (!res.ok) return rejectWithValue(data.message);
  return data.data;
});

// ─── Slice ─────────────────────────────────────────────────────────────────

const assignmentsSlice = createSlice({
  name: 'assignments',
  initialState: {
    items:      [],
    pagination: null,
    loading:    false,
    error:      null,
    filter:     'upcoming', // upcoming | overdue | completed
  },
  reducers: {
    setFilter: (state, action) => { state.filter = action.payload; },
    // Socket.IO real-time reducers
    assignmentAdded:   (state, action) => { state.items.unshift(action.payload); },
    assignmentUpdated: (state, action) => {
      const idx = state.items.findIndex(a => a._id === action.payload._id);
      if (idx !== -1) state.items[idx] = action.payload;
    },
    assignmentDeleted: (state, action) => {
      state.items = state.items.filter(a => a._id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssignments.pending,    (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAssignments.fulfilled,  (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAssignments.rejected,   (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createAssignment.fulfilled,  (state, action) => { state.items.unshift(action.payload); })
      .addCase(updateAssignment.fulfilled,  (state, action) => {
        const idx = state.items.findIndex(a => a._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteAssignment.fulfilled,  (state, action) => {
        state.items = state.items.filter(a => a._id !== action.payload);
      })
      .addCase(completeAssignment.fulfilled,(state, action) => {
        const idx = state.items.findIndex(a => a._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(toggleReminder.fulfilled,    (state, action) => {
        const idx = state.items.findIndex(a => a._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      });
  },
});

export const { setFilter, assignmentAdded, assignmentUpdated, assignmentDeleted } = assignmentsSlice.actions;
export default assignmentsSlice.reducer;
