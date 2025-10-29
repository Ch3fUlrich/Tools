import React from 'react';

export const AdvantageIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 text-gray-900 dark:text-white' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11h6l-2-2" />
    <path d="M21 13h-6l2 2" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export default AdvantageIcon;
