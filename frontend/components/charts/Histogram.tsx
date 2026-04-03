import React from 'react';

export const Histogram: React.FC<{ values: number[]; className?: string }> = ({ values, className }) => {
  if (!values || values.length === 0) return <div className={className}>No data</div>;

  // Build frequency distribution
  const freq: Record<number, number> = {};
  values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  const min = Math.min(...values);
  const max = Math.max(...values);
  const maxFreq = Math.max(...Object.values(freq));
  const totalBars = max - min + 1;
  const barW = 90 / totalBars;

  return (
    <svg
      data-testid="histogram"
      className={`${className ?? ''} text-current text-gray-900 dark:text-white`}
      viewBox="0 0 100 36"
    >
      {Array.from({ length: totalBars }, (_, i) => {
        const val = min + i;
        const count = freq[val] || 0;
        const h = count > 0 ? Math.max(2, (count / maxFreq) * 26) : 0;
        const x = 5 + i * barW;
        return (
          <g key={val}>
            {count > 0 && (
              <rect x={x} y={30 - h} width={Math.max(1, barW - 1)} height={h} fill="var(--accent)" rx="1" />
            )}
            <text x={x + barW / 2} y="35" fontSize="4" textAnchor="middle" fill="currentColor">{val}</text>
          </g>
        );
      })}
    </svg>
  );
};

export default Histogram;
