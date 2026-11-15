'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSubjects, createSubject, updateSubject, deleteSubject } from '@/store/subjectsSlice';
import ProtectedLayout from '@/components/ProtectedLayout';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';

function SubjectForm({ initial = {}, onSave, onCancel, loading }) {
  const [form, setForm]   = useState({ name: initial.name || '', code: initial.code || '' });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Subject name is required.'); return; }
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Subject Name *</label>
        <input
          className={`input ${error ? 'input-error' : ''}`}
          placeholder="e.g. Data Structures"
          value={form.name}
          onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setError(''); }}
          autoFocus
        />
        {error && <p className="field-error">{error}</p>}
      </div>
      <div>
        <label className="label">Subject Code (optional)</label>
        <input
          className="input"
          placeholder="e.g. CS301"
          value={form.code}
          onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
        />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary btn">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary btn">
          {loading
            ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</span>
            : initial._id ? 'Update Subject' : 'Add Subject'}
        </button>
      </div>
    </form>
  );
}

export default function SubjectsPage() {
  const dispatch  = useDispatch();
  const { items: subjects, loading } = useSelector(s => s.subjects);

  const [showAdd,     setShowAdd]     = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [deleting,    setDeleting]    = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [delLoading,  setDelLoading]  = useState(false);
  const [apiError,    setApiError]    = useState('');
  const [success,     setSuccess]     = useState('');

  useEffect(() => { dispatch(fetchSubjects()); }, [dispatch]);

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const handleAdd = async (form) => {
    setSaving(true); setApiError('');
    try {
      await dispatch(createSubject(form)).unwrap();
      setShowAdd(false);
      flash('Subject added!');
    } catch (e) { setApiError(e); }
    finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true); setApiError('');
    try {
      await dispatch(updateSubject({ id: editing._id, ...form })).unwrap();
      setEditing(null);
      flash('Subject updated!');
    } catch (e) { setApiError(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDelLoading(true);
    try {
      await dispatch(deleteSubject(deleting._id)).unwrap();
      setDeleting(null);
      flash('Subject deleted.');
    } catch (e) { setApiError(e); }
    finally { setDelLoading(false); }
  };

  return (
    <ProtectedLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">📚 My Subjects</h1>
          <p className="text-sm text-slate-400 mt-0.5">{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary btn" id="btn-add-subject">
          + Add Subject
        </button>
      </div>

      {success   && <div className="alert-success mb-4">{success}</div>}
      {apiError  && <div className="alert-error mb-4">{apiError}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No subjects yet"
          description="Add your first subject to get started tracking assignments and attendance."
          action={<button onClick={() => setShowAdd(true)} className="btn-primary btn">Add Subject</button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(sub => (
            <div key={sub._id} className="card-hover group animate-slide-up">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-100 truncate">{sub.name}</h3>
                  {sub.code && <span className="badge-blue text-xs mt-1">{sub.code}</span>}
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditing(sub)}
                    className="btn-ghost btn btn-icon text-xs"
                    title="Edit"
                  >✏️</button>
                  <button
                    onClick={() => setDeleting(sub)}
                    className="btn-ghost btn btn-icon text-xs"
                    title="Delete"
                  >🗑️</button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Added {new Date(sub.createdAt).toLocaleDateString('en-IN')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Add Subject" onClose={() => setShowAdd(false)}>
          <SubjectForm onSave={handleAdd} onCancel={() => setShowAdd(false)} loading={saving} />
        </Modal>
      )}

      {/* Edit Modal */}
      {editing && (
        <Modal title="Edit Subject" onClose={() => setEditing(null)}>
          <SubjectForm initial={editing} onSave={handleEdit} onCancel={() => setEditing(null)} loading={saving} />
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleting && (
        <ConfirmDialog
          title="Delete Subject"
          message={`Delete "${deleting.name}"? This will also remove all its assignments and attendance records. This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          loading={delLoading}
        />
      )}
    </ProtectedLayout>
  );
}
