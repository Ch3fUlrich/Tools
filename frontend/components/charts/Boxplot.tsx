import React from 'react';

export const Boxplot: React.FC<{ values: number[]; className?: string }> = ({ values, className }) => {
  // Minimal placeholder: show min/median/max as an inline SVG
  if (!values || values.length === 0) return <div className={className}>No data</div>;
  const sorted = [...values].sort((a,b)=>a-b);
  const min = sorted[0];
  const max = sorted[sorted.length-1];
  const median = sorted[Math.floor(sorted.length/2)];

  return (
    // Ensure svg children using `currentColor` have a safe default color
    <svg
      data-testid="boxplot"
      className={`${className ?? ''} text-current text-gray-900 dark:text-white`}
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
    >
      <line x1="5" x2="95" y1="10" y2="10" stroke="currentColor" strokeWidth="2" />
      <rect x="45" y="4" width="10" height="12" fill="var(--accent)" rx="2" />
      <circle cx="50" cy="10" r="2" fill="var(--bg)" />
      <text x="2" y="18" fontSize="6" fill="currentColor">{min}</text>
      <text x="50" y="6" fontSize="6" textAnchor="middle" fill="var(--bg)">{median}</text>
      <text x="92" y="18" fontSize="6" fill="currentColor">{max}</text>
    </svg>
  );
}

export default Boxplot;
