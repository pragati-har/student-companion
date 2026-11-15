import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ─── Async Thunks ──────────────────────────────────────────────────────────

export const fetchSubjects = createAsyncThunk('subjects/fetchAll', async (_, { rejectWithValue }) => {
  const res = await fetch('/api/subjects');
  const data = await res.json();
  if (!res.ok) return rejectWithValue(data.message);
  return data.data;
});

export const createSubject = createAsyncThunk('subjects/create', async (payload, { rejectWithValue }) => {
  const res = await fetch('/api/subjects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) return rejectWithValue(data.message);
  return data.data;
});

export const updateSubject = createAsyncThunk('subjects/update', async ({ id, ...payload }, { rejectWithValue }) => {
  const res = await fetch(`/api/subjects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) return rejectWithValue(data.message);
  return data.data;
});

export const deleteSubject = createAsyncThunk('subjects/delete', async (id, { rejectWithValue }) => {
  const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) return rejectWithValue(data.message);
  return id;
});

// ─── Slice ─────────────────────────────────────────────────────────────────

const subjectsSlice = createSlice({
  name: 'subjects',
  initialState: {
    items:   [],
    loading: false,
    error:   null,
  },
  reducers: {
    // Called by Socket.IO real-time events
    subjectAdded:   (state, action) => { state.items.unshift(action.payload); },
    subjectUpdated: (state, action) => {
      const idx = state.items.findIndex(s => s._id === action.payload._id);
      if (idx !== -1) state.items[idx] = action.payload;
    },
    subjectDeleted: (state, action) => {
      state.items = state.items.filter(s => s._id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubjects.pending,  (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSubjects.fulfilled,(state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchSubjects.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createSubject.fulfilled,(state, action) => { state.items.unshift(action.payload); })
      .addCase(updateSubject.fulfilled,(state, action) => {
        const idx = state.items.findIndex(s => s._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteSubject.fulfilled,(state, action) => {
        state.items = state.items.filter(s => s._id !== action.payload);
      });
  },
});

export const { subjectAdded, subjectUpdated, subjectDeleted } = subjectsSlice.actions;
export default subjectsSlice.reducer;
