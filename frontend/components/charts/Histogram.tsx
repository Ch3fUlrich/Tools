import React from 'react';

export const Histogram: React.FC<{ values: number[]; className?: string }> = ({ values, className }) => {
  if (!values || values.length === 0) return <div className={className}>No data</div>;
  const max = Math.max(...values);
  return (
    <svg className={className} viewBox="0 0 100 30" preserveAspectRatio="none">
      {values.map((v, i) => {
        const h = (v / max) * 28;
        const x = 2 + i * (96 / values.length);
        return <rect key={i} x={x} y={30 - h} width={Math.max(1, 96 / values.length - 1)} height={h} fill="#60a5fa" />
      })}
    </svg>
  );
}

export default Histogram;
