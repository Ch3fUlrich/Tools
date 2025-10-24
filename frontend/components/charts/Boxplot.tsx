import React from 'react';

export const Boxplot: React.FC<{ values: number[]; className?: string }> = ({ values, className }) => {
  // Minimal placeholder: show min/median/max as an inline SVG
  if (!values || values.length === 0) return <div className={className}>No data</div>;
  const sorted = [...values].sort((a,b)=>a-b);
  const min = sorted[0];
  const max = sorted[sorted.length-1];
  const median = sorted[Math.floor(sorted.length/2)];

  return (
    <svg className={className} viewBox="0 0 100 20" preserveAspectRatio="none">
      <line x1="5" x2="95" y1="10" y2="10" stroke="#e5e7eb" strokeWidth="2" />
      <rect x="45" y="4" width="10" height="12" fill="#6366f1" rx="2" />
      <circle cx="50" cy="10" r="2" fill="#fff" />
  <text x="2" y="18" fontSize="6" fill="#6b7280">{min}</text>
  <text x="50" y="6" fontSize="6" textAnchor="middle" fill="#f8fafc">{median}</text>
  <text x="92" y="18" fontSize="6" fill="#6b7280">{max}</text>
    </svg>
  );
}

export default Boxplot;
