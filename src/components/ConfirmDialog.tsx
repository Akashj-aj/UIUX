import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel',
  variant = 'danger', onConfirm, onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }} role="alertdialog" aria-modal="true" aria-label={title}>
        <div className="confirm-dialog">
          <div className={`confirm-dialog-icon ${variant}`}>
            <AlertTriangle size={24} />
          </div>
          <div className="confirm-dialog-title">{title}</div>
          <div className="confirm-dialog-text">{message}</div>
          <div className="confirm-dialog-actions">
            <button className="btn btn-secondary" onClick={onCancel}>{cancelLabel}</button>
            <button className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
