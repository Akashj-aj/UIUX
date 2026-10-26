import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import type { Toast, NotificationType } from '../types';
import { generateId } from '../services/dataService';

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: NotificationType, duration?: number, action?: { label: string; onClick: () => void }) => void;
  removeToast: (id: string) => void;
}

interface ActionToast extends Toast {
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActionToast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: NotificationType = 'success', duration: number = 4000, action?: { label: string; onClick: () => void }) => {
    const id = generateId();
    const toast: ActionToast = { id, type, message, duration, action };
    setToasts(prev => {
      if (prev.some(existing => existing.type === type && existing.message === message)) return prev;
      return [...prev, toast];
    });

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }: { toasts: ActionToast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  const renderIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} color="var(--color-success)" />;
      case 'warning':
        return <AlertTriangle size={16} color="var(--color-warning)" />;
      case 'error':
        return <AlertCircle size={16} color="var(--color-error)" />;
      case 'info':
      default:
        return <Info size={16} color="var(--color-info)" />;
    }
  };

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <span className="toast-icon">
            {renderIcon(toast.type)}
          </span>
          <div className="toast-content">
            <div className="toast-message">{toast.message}</div>
            {toast.action && (
              <button className="toast-action" onClick={() => { toast.action!.onClick(); onRemove(toast.id); }}>
                {toast.action.label}
              </button>
            )}
          </div>
          <button className="toast-close" onClick={() => onRemove(toast.id)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
