'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAssignments, createAssignment, updateAssignment,
  deleteAssignment, completeAssignment, toggleReminder, setFilter,
} from '@/store/assignmentsSlice';
import { fetchSubjects } from '@/store/subjectsSlice';
import ProtectedLayout from '@/components/ProtectedLayout';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import EmailRecipientDialog from '@/components/EmailRecipientDialog';
import { getErrorMessage } from '@/lib/errorMessage';

// ─── Deadline Countdown ─────────────────────────────────────────────────────
function Countdown({ deadline }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = new Date(deadline) - new Date();
      if (diff <= 0) { setText('Overdue'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setText(d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [deadline]);
  return <span className="text-xs font-mono text-amber-400">{text}</span>;
}

// ─── Assignment Form ────────────────────────────────────────────────────────
function AssignmentForm({ initial = {}, subjects, onSave, onCancel, loading }) {
  const [form, setForm]   = useState({
    title:       initial.title || '',
    subjectId:   initial.subjectId?._id || initial.subjectId || '',
    deadline:    initial.deadline ? new Date(initial.deadline).toISOString().slice(0, 16) : '',
    description: initial.description || '',
    remindMe:    initial.remindMe || false,
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.title.trim())   e.title     = 'Title is required.';
    if (!form.subjectId)      e.subjectId  = 'Subject is required.';
    if (!form.deadline)       e.deadline   = 'Deadline is required.';
    if (form.deadline && new Date(form.deadline) < new Date() && !initial._id)
      e.deadline = 'Deadline must be in the future.';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ ...form, deadline: new Date(form.deadline).toISOString() });
  };

  const Field = ({ name, label, children }) => (
    <div>
      <label className="label">{label}</label>
      {children}
      {errors[name] && <p className="field-error">{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field name="title" label="Assignment Title *">
        <input
          className={`input ${errors.title ? 'input-error' : ''}`}
          placeholder="e.g. Lab Report Chapter 3"
          value={form.title}
          onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setErrors(p => ({ ...p, title: '' })); }}
          autoFocus
        />
      </Field>

      <Field name="subjectId" label="Subject *">
        <select
          className={`input ${errors.subjectId ? 'input-error' : ''}`}
          value={form.subjectId}
          onChange={e => { setForm(p => ({ ...p, subjectId: e.target.value })); setErrors(p => ({ ...p, subjectId: '' })); }}
        >
          <option value="">— Select subject —</option>
          {subjects.map(s => <option key={s._id} value={s._id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>)}
        </select>
      </Field>

      <Field name="deadline" label="Deadline *">
        <input
          type="datetime-local"
          className={`input ${errors.deadline ? 'input-error' : ''}`}
          value={form.deadline}
          onChange={e => { setForm(p => ({ ...p, deadline: e.target.value })); setErrors(p => ({ ...p, deadline: '' })); }}
        />
      </Field>

      <Field name="description" label="Description (optional)">
        <textarea
          className="input resize-none"
          rows={3}
          placeholder="Any notes about this assignment…"
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
        />
      </Field>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          className="w-4 h-4 rounded accent-primary-500"
          checked={form.remindMe}
          onChange={e => setForm(p => ({ ...p, remindMe: e.target.checked }))}
        />
        <span className="text-sm text-slate-300">
          🔔           Show an in-app notification within 24 hours of the deadline
        </span>
      </label>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary btn">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary btn">
          {loading
            ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</span>
            : initial._id ? 'Update' : 'Add Assignment'}
        </button>
      </div>
    </form>
  );
}

// ─── Assignment Card ────────────────────────────────────────────────────────
function AssignmentCard({ a, onEdit, onDelete, onComplete, onToggleRemind, onPrepareEmail, actionLoading }) {
  const isOverdue   = a.status === 'pending' && new Date(a.deadline) < new Date();
  const isCompleted = a.status === 'completed';

  return (
    <div className={`card-hover group ${isCompleted ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-semibold text-sm ${isCompleted ? 'line-through text-slate-500' : 'text-slate-100'}`}>
              {a.title}
            </h3>
            {isOverdue    && <span className="badge-red">Overdue</span>}
            {isCompleted  && <span className="badge-gray">Done</span>}
            {a.remindMe && !isCompleted && <span className="badge-blue">🔔 In-app alert</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{a.subjectId?.name || '—'}</p>
        </div>
        {/* Actions */}
        <div className="flex gap-1 shrink-0">
          {!isCompleted && (
            <>
              <button
                type="button"
                onClick={() => onPrepareEmail(a)}
                disabled={actionLoading === a._id}
                className="btn-ghost btn btn-sm"
                title="Send an email reminder to an address you choose"
              >✉ Remind</button>
              <button onClick={() => onEdit(a)} className="btn-ghost btn btn-icon text-xs" title="Edit">✏️</button>
              <button
                onClick={() => onToggleRemind(a)}
                disabled={actionLoading === a._id}
                className="btn-ghost btn btn-icon text-xs"
                title={actionLoading === a._id ? 'Saving reminder...' : a.remindMe ? 'Disable reminder' : 'Enable reminder'}
              >{actionLoading === a._id ? '⏳' : a.remindMe ? '🔕' : '🔔'}</button>
              <button
                onClick={() => onComplete(a._id)}
                disabled={actionLoading === a._id}
                className="btn-success btn btn-sm"
                title="Mark complete"
              >✓ Done</button>
            </>
          )}
          <button onClick={() => onDelete(a)} className="btn-ghost btn btn-icon text-xs" title="Delete">🗑️</button>
        </div>
      </div>

      {a.description && (
        <p className="text-xs text-slate-500 mb-2 line-clamp-2">{a.description}</p>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-border/50">
        <span className="text-xs text-slate-500">
          📅 {new Date(a.deadline).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
        {!isCompleted && <Countdown deadline={a.deadline} />}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'upcoming',  label: 'Upcoming' },
  { key: 'overdue',   label: 'Overdue'  },
  { key: 'completed', label: 'Completed'},
];

export default function AssignmentsPage() {
  const dispatch    = useDispatch();
  const { items: assignments, loading, filter } = useSelector(s => s.assignments);
  const subjects    = useSelector(s => s.subjects.items);

  const [showAdd,    setShowAdd]    = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [deleting,   setDeleting]   = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [delLoading, setDelLoading] = useState(false);
  const [actionLoad, setActionLoad] = useState(null);
  const [apiError,   setApiError]   = useState('');
  const [success,    setSuccess]    = useState('');
  const [emailDialog, setEmailDialog] = useState(null);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    dispatch(fetchSubjects());
    dispatch(fetchAssignments({ status: filter }));
  }, [dispatch, filter]);

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const handleAdd = async (form) => {
    setSaving(true); setApiError('');
    try {
      await dispatch(createAssignment(form)).unwrap();
      setShowAdd(false);
      flash('Assignment added!');
    } catch (e) { setApiError(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true); setApiError('');
    try {
      await dispatch(updateAssignment({ id: editing._id, ...form })).unwrap();
      setEditing(null);
      flash('Assignment updated!');
    } catch (e) { setApiError(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDelLoading(true);
    try {
      await dispatch(deleteAssignment(deleting._id)).unwrap();
      setDeleting(null);
      flash('Assignment deleted.');
    } catch (e) { setApiError(getErrorMessage(e)); }
    finally { setDelLoading(false); }
  };

  const handleComplete = async (id) => {
    setActionLoad(id);
    try {
      await dispatch(completeAssignment(id)).unwrap();
      flash('Marked as completed!');
      dispatch(fetchAssignments({ status: filter }));
    } catch (e) { setApiError(getErrorMessage(e)); }
    finally { setActionLoad(null); }
  };

  const handleToggleRemind = async (a) => {
    setActionLoad(a._id);
    setApiError('');
    setSuccess('');
    try {
      await dispatch(toggleReminder({ id: a._id, remindMe: !a.remindMe })).unwrap();
      flash(a.remindMe ? 'In-app reminder disabled.' : 'In-app reminder enabled for the 24 hours before the deadline.');
    } catch (e) {
      setApiError(getErrorMessage(e, 'Could not update the assignment reminder.'));
    } finally {
      setActionLoad(null);
    }
  };

  // Client-side filter for display
  const now = new Date();
  const displayed = assignments.filter(a => {
    if (filter === 'completed') return a.status === 'completed';
    if (filter === 'overdue')   return a.status === 'pending' && new Date(a.deadline) <= now;
    return a.status === 'pending' && new Date(a.deadline) > now;
  });
  const openEmailDialog = (type, assignment = null) => {
    if (!window.crypto?.randomUUID) {
      setApiError('Secure email submission is unavailable in this browser.');
      return;
    }
    setEmailRecipient('');
    setEmailError('');
    setEmailDialog({ type, assignment, requestId: window.crypto.randomUUID() });
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    if (!emailDialog || emailSending) return;
    setEmailSending(true);
    setEmailError('');

    const isReminder = emailDialog.type === 'reminder';
    const endpoint = isReminder
      ? `/api/assignments/${emailDialog.assignment._id}/remind-email`
      : '/api/assignments/share';
    const payload = {
      recipient: emailRecipient,
      requestId: emailDialog.requestId,
      ...(isReminder ? {} : { assignmentIds: displayed.map(assignment => assignment._id) }),
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Email could not be submitted.');
      setEmailDialog(null);
      flash(result.data?.alreadySent
        ? `This email was already accepted by Resend for ${result.data.sentTo}.`
        : `Email accepted by Resend for ${result.data.sentTo}. Delivery is not guaranteed.`);
    } catch (error) {
      setEmailError(getErrorMessage(error, 'Email could not be submitted. Please try again.'));
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">📝 Assignments</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openEmailDialog('list')}
            disabled={displayed.length === 0 || emailSending}
            className="btn-secondary btn"
            title={displayed.length === 0 ? 'There are no assignments in this list' : 'Email this assignment list'}
          >✉ Send a list</button>
          <button onClick={() => setShowAdd(true)} className="btn-primary btn" id="btn-add-assignment">
            + Add Assignment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-lg p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => dispatch(setFilter(t.key))}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              filter === t.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {success  && <div className="alert-success mb-4">{success}</div>}
      {apiError && <div className="alert-error mb-4">{apiError}</div>}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={filter === 'completed' ? '🎉' : filter === 'overdue' ? '✅' : '📝'}
          title={
            filter === 'completed' ? 'No completed assignments'
            : filter === 'overdue'  ? 'No overdue assignments!'
            : 'No upcoming assignments'
          }
          description={filter === 'upcoming' ? 'Add your first assignment to track it here.' : undefined}
          action={filter === 'upcoming'
            ? <button onClick={() => setShowAdd(true)} className="btn-primary btn">Add Assignment</button>
            : undefined
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map(a => (
            <AssignmentCard
              key={a._id}
              a={a}
              onEdit={setEditing}
              onDelete={setDeleting}
              onComplete={handleComplete}
              onToggleRemind={handleToggleRemind}
              onPrepareEmail={(assignment) => openEmailDialog('reminder', assignment)}
              actionLoading={actionLoad}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Assignment" onClose={() => setShowAdd(false)} size="lg">
          <AssignmentForm subjects={subjects} onSave={handleAdd} onCancel={() => setShowAdd(false)} loading={saving} />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Assignment" onClose={() => setEditing(null)} size="lg">
          <AssignmentForm initial={editing} subjects={subjects} onSave={handleEdit} onCancel={() => setEditing(null)} loading={saving} />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete Assignment"
          message={`Delete "${deleting.title}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          loading={delLoading}
        />
      )}
      {emailDialog && (
        <EmailRecipientDialog
          title={emailDialog.type === 'reminder' ? 'Email assignment reminder' : 'Email assignment list'}
          description={emailDialog.type === 'reminder'
            ? `Send a reminder for "${emailDialog.assignment.title}". Choose the recipient explicitly.`
            : `Send the ${filter} assignments currently shown. Choose the recipient explicitly.`}
          recipient={emailRecipient}
          onRecipientChange={setEmailRecipient}
          onSubmit={handleEmailSubmit}
          onCancel={() => setEmailDialog(null)}
          loading={emailSending}
          error={emailError}
        />
      )}
    </ProtectedLayout>
  );
}
