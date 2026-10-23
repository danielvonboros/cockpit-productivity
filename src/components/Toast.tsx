import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ToastContext, type ToastOptions } from '../hooks/useToast';
import { Icon } from './Icon';

const TOAST_MS = 2800;
/** Longer when there is something to undo */
const UNDO_MS = 6000;

interface ToastState extends ToastOptions {
  key: number;
  message: string;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    setToast({ key: Date.now(), message, ...options });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.action ? UNDO_MS : TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div key={toast.key} className={`toast${toast.tone === 'success' ? ' toast--success' : ''}`}>
            {toast.tone === 'success' && <Icon name="sparkle" size={16} />}
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  toast.action?.run();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
