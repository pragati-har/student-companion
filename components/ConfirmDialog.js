'use client';

import Modal from './Modal';

export default function ConfirmDialog({ title, message, onConfirm, onCancel, confirmText = 'Delete', loading = false }) {
  return (
    <Modal title={title} onClose={onCancel} size="sm">
      <p className="text-sm text-slate-400 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="btn-secondary btn" disabled={loading}>
          Cancel
        </button>
        <button onClick={onConfirm} className="btn-danger btn" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Deleting...
            </span>
          ) : confirmText}
        </button>
      </div>
    </Modal>
  );
}
