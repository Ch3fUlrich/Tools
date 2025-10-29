import React from 'react';

export const DiceIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4 text-gray-900 dark:text-white' }) => (
  <svg className={className} viewBox="0 0 22 22" fill="currentColor" width="36" height="36">
    <path d="M 0 0 L 0 22 L 22 22 L 22 0 L 0 0 z M 2 2 L 20 2 L 20 20 L 2 20 L 2 2 z M 6 3 A 2 2 0 0 0 6 7 A 2 2 0 0 0 6 3 z M 16 3 A 2 2 0 0 0 16 7 A 2 2 0 0 0 16 3 z M 6 9 A 2 2 0 0 0 6 13 A 2 2 0 0 0 6 9 z M 16 9 A 2 2 0 0 0 16 13 A 2 2 0 0 0 16 9 z M 6 15 A 2 2 0 0 0 6 19 A 2 2 0 0 0 6 15 z M 16 15 A 2 2 0 0 0 16 19 A 2 2 0 0 0 16 15 z"/>
  </svg>
);

export default DiceIcon;
