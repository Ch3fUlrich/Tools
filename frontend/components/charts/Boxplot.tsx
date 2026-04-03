import React from 'react';

export const Boxplot: React.FC<{ values: number[]; className?: string }> = ({ values, className }) => {
  if (!values || values.length === 0) return <div className={className}>No data</div>;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min || 1;

  // Map a value to an x position in [5, 95]
  const px = (v: number) => 5 + ((v - min) / range) * 90;

  const q1 = sorted[Math.floor(n * 0.25)];
  const median = sorted[Math.floor(n / 2)];
  const q3 = sorted[Math.floor(n * 0.75)];

  const x1 = px(min);
  const xQ1 = px(q1);
  const xMed = px(median);
  const xQ3 = px(q3);
  const x4 = px(max);
  const boxW = Math.max(2, xQ3 - xQ1);

  return (
    <svg
      data-testid="boxplot"
      className={`${className ?? ''} text-current text-gray-900 dark:text-white`}
      viewBox="0 0 100 24"
    >
      {/* Whisker line */}
      <line x1={x1} x2={x4} y1="11" y2="11" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      {/* Whisker end caps */}
      <line x1={x1} x2={x1} y1="7" y2="15" stroke="currentColor" strokeWidth="1.5" />
      <line x1={x4} x2={x4} y1="7" y2="15" stroke="currentColor" strokeWidth="1.5" />
      {/* IQR box */}
      <rect x={xQ1} y="5" width={boxW} height="12" fill="var(--accent)" opacity="0.75" rx="2" />
      {/* Median line */}
      <line x1={xMed} x2={xMed} y1="4" y2="18" stroke="white" strokeWidth="2" strokeOpacity="0.9" />
      {/* Min / max labels */}
      <text x={x1} y="23" fontSize="5" textAnchor="middle" fill="currentColor">{min}</text>
      <text x={x4} y="23" fontSize="5" textAnchor="middle" fill="currentColor">{max}</text>
    </svg>
  );
};

export default Boxplot;
