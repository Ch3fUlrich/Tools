import React from 'react';

interface DataPoint {
  time: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  className?: string;
  color?: string;
  title?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  width = 400,
  height = 200,
  className = '',
  color = '#3b82f6',
  title
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <p className="text-gray-500 dark:text-gray-400">No data to display</p>
      </div>
    );
  }

  // Filter out invalid data points (NaN, null, undefined values)
  const validData = data.filter(point => 
    point && 
    point.time && 
    typeof point.value === 'number' && 
    !isNaN(point.value) && 
    isFinite(point.value)
  );

  if (validData.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <p className="text-gray-500 dark:text-gray-400">No valid data to display</p>
      </div>
    );
  }

  // Parse times and find min/max values
  const parsedData = validData.map(point => ({
    ...point,
    timestamp: new Date(point.time).getTime()
  }));

  const minTime = Math.min(...parsedData.map(d => d.timestamp));
  const maxTime = Math.max(...parsedData.map(d => d.timestamp));
  const minValue = Math.min(...parsedData.map(d => d.value));
  const maxValue = Math.max(...parsedData.map(d => d.value));

  // Add some padding to the ranges
  const timeRange = maxTime - minTime || 1;
  const valueRange = maxValue - minValue || 1;
  const timePadding = timeRange * 0.05;
  const valuePadding = valueRange * 0.1;

  const chartMinTime = minTime - timePadding;
  const chartMaxTime = maxTime + timePadding;
  const chartMinValue = Math.max(0, minValue - valuePadding); // Don't go below 0
  const chartMaxValue = maxValue + valuePadding;

  // Convert data points to SVG coordinates
  const points = parsedData.map(point => {
    const x = ((point.timestamp - chartMinTime) / (chartMaxTime - chartMinTime)) * (width - 60) + 30;
    const y = height - 40 - ((point.value - chartMinValue) / (chartMaxValue - chartMinValue)) * (height - 80);
    return { x, y, ...point };
  });

  // Create path for the line
  const pathData = points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  // Format time labels
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate tick positions
  const xTicks = [];
  const yTicks = [];

  // X-axis ticks (time)
  for (let i = 0; i <= 4; i++) {
    const timestamp = chartMinTime + (timeRange * i) / 4;
    const x = 30 + (i * (width - 60)) / 4;
    xTicks.push({ x, label: formatTime(timestamp) });
  }

  // Y-axis ticks (values)
  for (let i = 0; i <= 4; i++) {
    const value = chartMinValue + (chartMaxValue - chartMinValue) * i / 4;
    const y = height - 40 - (i * (height - 80)) / 4;
    yTicks.push({ y, label: value.toFixed(2) });
  }

  return (
    <div className={className}>
      {title && (
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 text-center">
          {title}
        </h3>
      )}
      <svg width={width} height={height} className="border border-gray-200 dark:border-gray-700 rounded">
        {/* Grid lines */}
        {xTicks.map((tick, i) => (
          <line
            key={`x-grid-${i}`}
            x1={tick.x}
            y1={20}
            x2={tick.x}
            y2={height - 40}
            stroke="#e5e7eb"
            strokeWidth="1"
            opacity="0.5"
          />
        ))}
        {yTicks.map((tick, i) => (
          <line
            key={`y-grid-${i}`}
            x1={30}
            y1={tick.y}
            x2={width - 30}
            y2={tick.y}
            stroke="#e5e7eb"
            strokeWidth="1"
            opacity="0.5"
          />
        ))}

        {/* Axes */}
        <line x1="30" y1={height - 40} x2={width - 30} y2={height - 40} stroke="#6b7280" strokeWidth="1" />
        <line x1="30" y1="20" x2="30" y2={height - 40} stroke="#6b7280" strokeWidth="1" />

        {/* X-axis labels */}
        {xTicks.map((tick, i) => (
          <text
            key={`x-label-${i}`}
            x={tick.x}
            y={height - 20}
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280"
          >
            {tick.label}
          </text>
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <text
            key={`y-label-${i}`}
            x="25"
            y={tick.y + 3}
            textAnchor="end"
            fontSize="10"
            fill="#6b7280"
          >
            {tick.label}
          </text>
        ))}

        {/* Data line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {points.map((point, i) => (
          <circle
            key={`point-${i}`}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={color}
            stroke="white"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
};

export default LineChart;