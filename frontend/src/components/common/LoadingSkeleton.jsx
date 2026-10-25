import React from 'react';

export const LoadingSkeleton = ({ lines = 5, height = 36, className = '' }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }} className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: `${height}px`,
            width: i === lines - 1 && lines > 1 ? '70%' : '100%',
          }}
        />
      ))}
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="skeleton" style={{ height: '16px', width: '40%' }} />
      <div className="skeleton" style={{ height: '32px', width: '60%' }} />
      <div className="skeleton" style={{ height: '14px', width: '80%' }} />
    </div>
  );
};

export default LoadingSkeleton;
