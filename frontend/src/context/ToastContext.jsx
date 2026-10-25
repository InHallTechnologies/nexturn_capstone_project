import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = 'info', message, title, duration = 4500 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast = { id, type, message, title };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const showSuccess = useCallback(
    (message, title = 'Success') => {
      addToast({ type: 'success', message, title });
    },
    [addToast]
  );

  const showError = useCallback(
    (message, title = 'Error') => {
      addToast({ type: 'danger', message, title, duration: 6000 });
    },
    [addToast]
  );

  const showWarning = useCallback(
    (message, title = 'Warning') => {
      addToast({ type: 'warning', message, title, duration: 5000 });
    },
    [addToast]
  );

  const showInfo = useCallback(
    (message, title = 'Notice') => {
      addToast({ type: 'info', message, title });
    },
    [addToast]
  );

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} style={{ color: 'var(--success-solid)', flexShrink: 0 }} />;
      case 'warning':
        return <AlertTriangle size={18} style={{ color: 'var(--warning-solid)', flexShrink: 0 }} />;
      case 'danger':
        return <AlertCircle size={18} style={{ color: 'var(--danger-solid)', flexShrink: 0 }} />;
      default:
        return <Info size={18} style={{ color: 'var(--info-solid)', flexShrink: 0 }} />;
    }
  };

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showWarning, showInfo }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast" role="alert">
            {getToastIcon(toast.type)}
            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && (
                <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.15rem' }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.1rem',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Close notification"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
