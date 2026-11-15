'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendance, saveAttendance, fetchAttendanceSummary } from '@/store/attendanceSlice';
import { fetchSubjects } from '@/store/subjectsSlice';
import ProtectedLayout from '@/components/ProtectedLayout';
import EmptyState from '@/components/EmptyState';
import EmailRecipientDialog from '@/components/EmailRecipientDialog';
import { getErrorMessage } from '@/lib/errorMessage';

// ─── Progress Bar ─────────────────────────────────────────────────────────
function ProgressBar({ value }) {
  const color = value >= 75 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="progress-bar mt-1.5">
      <div className={`progress-fill ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

// ─── Summary Section ──────────────────────────────────────────────────────
function AttendanceSummary({ summary, onShareReport, reportLoading }) {
  const overall = summary?.overallPercent ?? 0;
  const statusColor = overall >= 75 ? 'text-emerald-400' : overall >= 60 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-100">📊 Attendance Summary</h2>
        <button
          type="button"
          onClick={onShareReport}
          disabled={reportLoading}
          className="btn-primary btn btn-sm"
          title="Email this attendance summary"
        >{reportLoading ? 'Submitting...' : '✉ Share attendance'}</button>
      </div>

      {/* Overall */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-300">Overall Attendance</span>
        <span className={`text-lg font-bold ${statusColor}`}>{overall}%</span>
      </div>
      <ProgressBar value={overall} />
      <p className="text-xs text-slate-500 mt-1.5">
        {summary?.overallPresent ?? 0} present out of {summary?.overallTotal ?? 0} recorded classes
      </p>

      {overall < 75 && (
        <div className="alert-error mt-3 text-xs">
          ⚠️ Your overall attendance is below 75%. Please attend more classes.
        </div>
      )}

      {/* Per-subject grid */}
      {summary?.subjects?.length > 0 && (
        <div className="mt-5 grid sm:grid-cols-2 gap-4">
          {summary.subjects.map(s => (
            <div key={s.subject._id} className="bg-surface rounded-lg p-3 border border-surface-border">
              <div className="flex justify-between items-start mb-1">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{s.subject.name}</p>
                  {s.subject.code && <p className="text-xs text-slate-500">{s.subject.code}</p>}
                </div>
                <span className={`text-sm font-bold ml-2 shrink-0 ${
                  s.percent >= 75 ? 'text-emerald-400' : s.percent >= 60 ? 'text-amber-400' : 'text-red-400'
                }`}>{s.percent}%</span>
              </div>
              <ProgressBar value={s.percent} />
              <p className="text-xs text-slate-500 mt-1">{s.present}/{s.total} classes</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mark Attendance Form ─────────────────────────────────────────────────
function MarkAttendanceForm({ subjects, onSave, saving }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm]   = useState({ subjectId: '', date: today, status: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.subjectId) e.subjectId = 'Select a subject.';
    if (!form.date)      e.date      = 'Select a date.';
    if (!form.status)    e.status    = 'Mark present or absent.';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(form);
    setErrors({});
  };

  return (
    <div className="card mb-6">
      <h2 className="font-semibold text-slate-100 mb-4">✏️ Mark Attendance</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Subject *</label>
            <select
              className={`input ${errors.subjectId ? 'input-error' : ''}`}
              value={form.subjectId}
              onChange={e => { setForm(p => ({ ...p, subjectId: e.target.value })); setErrors(p => ({ ...p, subjectId: '' })); }}
            >
              <option value="">— Subject —</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            {errors.subjectId && <p className="field-error">{errors.subjectId}</p>}
          </div>

          <div>
            <label className="label">Date *</label>
            <input
              type="date"
              className={`input ${errors.date ? 'input-error' : ''}`}
              value={form.date}
              max={today}
              onChange={e => { setForm(p => ({ ...p, date: e.target.value })); setErrors(p => ({ ...p, date: '' })); }}
            />
            {errors.date && <p className="field-error">{errors.date}</p>}
          </div>

          <div>
            <label className="label">Status *</label>
            <div className="flex gap-2 mt-0.5">
              {['present', 'absent'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setForm(p => ({ ...p, status: s })); setErrors(p => ({ ...p, status: '' })); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                    form.status === s
                      ? s === 'present'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-red-700 text-white border-red-500'
                      : 'bg-surface border-surface-border text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {s === 'present' ? '✅ Present' : '❌ Absent'}
                </button>
              ))}
            </div>
            {errors.status && <p className="field-error">{errors.status}</p>}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary btn"
          id="btn-mark-attendance"
        >
          {saving
            ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</span>
            : 'Save Attendance'}
        </button>
      </form>
    </div>
  );
}

// ─── History Table ─────────────────────────────────────────────────────────
function HistoryTable({ records, subjects, loading }) {
  const [filterSubject, setFilterSubject] = useState('');
  const filtered = filterSubject
    ? records.filter(r => (r.subjectId?._id || r.subjectId) === filterSubject)
    : records;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-semibold text-slate-100">📋 History</h2>
        <select
          className="input w-auto text-sm"
          value={filterSubject}
          onChange={e => setFilterSubject(e.target.value)}
        >
          <option value="">All subjects</option>
          {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No attendance records found.</p>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r._id}>
                  <td>{new Date(r.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                  <td>{r.subjectId?.name || '—'}</td>
                  <td>
                    <span className={r.status === 'present' ? 'badge-green' : 'badge-red'}>
                      {r.status === 'present' ? '✅ Present' : '❌ Absent'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const dispatch = useDispatch();
  const { items: records, loading, summary } = useSelector(s => s.attendance);
  const subjects = useSelector(s => s.subjects.items);

  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState('');
  const [apiError, setApiError] = useState('');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailRequestId, setEmailRequestId] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    dispatch(fetchSubjects());
    dispatch(fetchAttendance({ limit: 100 }));
    dispatch(fetchAttendanceSummary());
  }, [dispatch]);

  const flash = (msg, isErr = false) => {
    if (isErr) setApiError(msg);
    else       setSuccess(msg);
    setTimeout(() => { setSuccess(''); setApiError(''); }, 4000);
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      await dispatch(saveAttendance(form)).unwrap();
      dispatch(fetchAttendanceSummary());
      flash('Attendance saved!');
    } catch (e) { flash(getErrorMessage(e), true); }
    finally { setSaving(false); }
  };

  const openEmailDialog = () => {
    if (!window.crypto?.randomUUID) {
      flash('Secure email submission is unavailable in this browser.', true);
      return;
    }
    setEmailRecipient('');
    setEmailError('');
    setEmailRequestId(window.crypto.randomUUID());
    setEmailDialogOpen(true);
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    if (emailSending) return;
    setEmailSending(true);
    setEmailError('');

    try {
      const response = await fetch('/api/attendance/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: emailRecipient, requestId: emailRequestId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Email could not be submitted.');
      setEmailDialogOpen(false);
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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">✅ Daily Attendance</h1>
        <p className="text-sm text-slate-400 mt-0.5">Record and track your class attendance</p>
      </div>

      {success  && <div className="alert-success mb-4">{success}</div>}
      {apiError && <div className="alert-error mb-4">{apiError}</div>}

      {subjects.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No subjects added"
          description="Add subjects first before recording attendance."
          action={<a href="/subjects" className="btn-primary btn">Go to Subjects</a>}
        />
      ) : (
        <>
          <AttendanceSummary
            summary={summary}
            onShareReport={openEmailDialog}
            reportLoading={emailSending}
          />
          <MarkAttendanceForm subjects={subjects} onSave={handleSave} saving={saving} />
          <HistoryTable records={records} subjects={subjects} loading={loading} />
        </>
      )}
      {emailDialogOpen && (
        <EmailRecipientDialog
          title="Email attendance summary"
          description="Send your current attendance summary. Choose the recipient explicitly."
          recipient={emailRecipient}
          onRecipientChange={setEmailRecipient}
          onSubmit={handleEmailSubmit}
          onCancel={() => { if (!emailSending) setEmailDialogOpen(false); }}
          loading={emailSending}
          error={emailError}
        />
      )}
    </ProtectedLayout>
  );
}
