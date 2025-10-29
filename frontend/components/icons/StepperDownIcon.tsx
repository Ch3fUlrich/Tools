import React from 'react';

export const StepperDownIcon: React.FC<{ className?: string }> = ({ className = 'w-3 h-3' }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 15a1 1 0 01-.707-.293l-4-4a1 1 0 111.414-1.414L10 12.586l3.293-3.293a1 1 0 111.414 1.414l-4 4A1 1 0 0110 15z" clipRule="evenodd" />
  </svg>
);

export default StepperDownIcon;