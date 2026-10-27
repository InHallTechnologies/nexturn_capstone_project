import React from 'react';

export const Badge = ({
  variant = 'neutral',
  children,
  icon: Icon,
  className = '',
  dot = false,
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            display: 'inline-block',
          }}
        />
      )}
      {Icon && <Icon size={12} />}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
