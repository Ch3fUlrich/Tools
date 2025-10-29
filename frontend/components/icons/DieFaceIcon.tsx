import React from 'react';

export const DieFaceIcon: React.FC<{ sides?: number; className?: string }> = ({ sides = 6, className = 'w-6 h-6' }) => {
  // For common dice, show a small badge with the number; for d6 show a dotted die glyph
  const label = sides === 6 ? '⚄' : `D${sides}`;
  return (
    <span className={`inline-flex items-center justify-center text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded ${className}`}>
      {label}
    </span>
  );
};

export default DieFaceIcon;
