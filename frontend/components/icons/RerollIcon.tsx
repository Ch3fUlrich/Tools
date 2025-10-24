import React from 'react';

export const RerollIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12a9 9 0 1 0-3 6.7" />
    <polyline points="21 15 21 21 15 21" />
  </svg>
);

export default RerollIcon;
