import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';

export const AccessDeniedPage = ({ requiredRoles = [] }) => {
  const { user } = useAuth();
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
          backgroundColor: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--danger-solid)',
          marginBottom: '1.25rem',
        }}
      >
        <ShieldAlert size={32} />
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
        Access Restricted
      </h2>
      <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', maxWidth: '440px', marginBottom: '0.5rem' }}>
        You do not have permission to access this section of Retail Inventory.
      </p>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '440px', marginBottom: '1.75rem' }}>
        Your account role is <strong>{user?.role || 'Unknown'}</strong>.
        {requiredRoles.length > 0 && (
          <span> Required role: <strong>{requiredRoles.join(' or ')}</strong>.</span>
        )}
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

export default AccessDeniedPage;
