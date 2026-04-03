import React from 'react';

export const DieFaceIcon: React.FC<{ sides?: number; className?: string }> = ({ sides = 6, className = 'w-6 h-6' }) => {
  const label = `D${sides}`;
  return (
    <span
      className={`inline-flex items-center justify-center text-xs font-semibold rounded px-1 ${className}`}
      style={{ background: 'var(--accent)', color: 'white' }}
    >
      {label}
    </span>
  );
};

export default DieFaceIcon;
