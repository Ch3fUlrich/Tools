import React from 'react';

export const DiceIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1" />
    <circle cx="15.5" cy="8.5" r="1" />
    <circle cx="8.5" cy="15.5" r="1" />
    <circle cx="15.5" cy="15.5" r="1" />
  </svg>
);

export default DiceIcon;
