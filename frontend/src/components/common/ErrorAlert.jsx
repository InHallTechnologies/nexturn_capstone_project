import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const ErrorAlert = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--danger-bg)',
        border: '1px solid var(--danger-border)',
        color: 'var(--danger-text)',
      }}
    >
      <AlertCircle size={20} style={{ color: 'var(--danger-solid)', flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--danger-text)', marginBottom: '0.2rem' }}>
          {title}
        </h4>
        <p style={{ fontSize: '0.8125rem', color: 'var(--danger-text)', opacity: 0.9 }}>
          {message || 'Unable to complete the operation. Please try again.'}
        </p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} icon={RefreshCw} style={{ flexShrink: 0 }}>
          Retry
        </Button>
      )}
    </div>
  );
};

export default ErrorAlert;
