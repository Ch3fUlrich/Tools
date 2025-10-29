import React from 'react';

export const StepperUpIcon: React.FC<{ className?: string }> = ({ className = 'w-3 h-3' }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 5a1 1 0 01.707.293l4 4a1 1 0 11-1.414 1.414L10 7.414 6.707 10.707A1 1 0 115.293 9.293l4-4A1 1 0 0110 5z" clipRule="evenodd" />
  </svg>
);

export default StepperUpIcon;