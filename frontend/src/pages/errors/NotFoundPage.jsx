import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--bg-muted)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          marginBottom: '1.25rem',
        }}
      >
        <HelpCircle size={32} />
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
        Page Not Found
      </h2>
      <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', maxWidth: '440px', marginBottom: '1.75rem' }}>
        The page you are looking for does not exist or may have been moved.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Button variant="secondary" onClick={() => navigate(-1)} icon={ArrowLeft}>
          Go Back
        </Button>
        <Button variant="primary" onClick={() => navigate('/dashboard')} icon={LayoutDashboard}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
