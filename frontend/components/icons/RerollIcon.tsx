import React from 'react';

export const RerollIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 text-gray-900 dark:text-white' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 0-3 6.7" />
    <polyline points="21 15 21 21 15 21" />
  </svg>
);

export default RerollIcon;
