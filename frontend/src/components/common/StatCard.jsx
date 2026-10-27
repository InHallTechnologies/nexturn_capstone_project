import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'primary',
  trend,
  loading = false,
}) => {
  const getIconStyles = () => {
    switch (variant) {
      case 'success':
        return { bg: 'var(--success-bg)', color: 'var(--success-solid)' };
      case 'warning':
        return { bg: 'var(--warning-bg)', color: 'var(--warning-solid)' };
      case 'danger':
        return { bg: 'var(--danger-bg)', color: 'var(--danger-solid)' };
      case 'info':
        return { bg: 'var(--info-bg)', color: 'var(--info-solid)' };
      default:
        return { bg: 'var(--primary-50)', color: 'var(--primary-600)' };
    }
  };

  const iconStyle = getIconStyles();

  return (
    <div className="card stat-card">
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        {Icon && (
          <div
            className="stat-icon-wrapper"
            style={{ backgroundColor: iconStyle.bg, color: iconStyle.color }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
          <div className="skeleton" style={{ height: '28px', width: '50%' }} />
          <div className="skeleton" style={{ height: '14px', width: '75%' }} />
        </div>
      ) : (
        <>
          <div className="stat-value">{value}</div>
          {(subtitle || trend) && (
            <div className="stat-subtext">
              {trend && (
                <span
                  style={{
                    fontWeight: 600,
                    color: trend > 0 ? 'var(--success-solid)' : trend < 0 ? 'var(--danger-solid)' : 'var(--text-muted)',
                  }}
                >
                  {trend > 0 ? `+${trend}%` : `${trend}%`}
                </span>
              )}
              {subtitle && <span>{subtitle}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StatCard;
