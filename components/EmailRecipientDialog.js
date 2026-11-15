'use client';

import Modal from '@/components/Modal';

export default function EmailRecipientDialog({
  title,
  description,
  recipient,
  onRecipientChange,
  onSubmit,
  onCancel,
  loading,
  error,
}) {
  const close = () => {
    if (!loading) onCancel();
  };

  return (
    <Modal title={title} onClose={close} size="sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-slate-400">{description}</p>
        <div>
          <label htmlFor="email-recipient" className="label">Recipient email *</label>
          <input
            id="email-recipient"
            className="input"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            value={recipient}
            onChange={event => onRecipientChange(event.target.value)}
            placeholder="recipient@example.com"
          />
        </div>
        {error && <p className="alert-error" role="alert">{error}</p>}
        <p className="text-xs text-slate-500">
          The email will be submitted through Resend. Provider acceptance does not guarantee delivery.
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={close} disabled={loading} className="btn-secondary btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary btn">
            {loading ? 'Submitting...' : 'Send email'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
