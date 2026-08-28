"use client";

import React, { useId } from 'react';
import type { SweepPoint } from '@/lib/local/elterngeld';
import { eur } from './format';

interface Props {
  points: SweepPoint[];
  optimum: SweepPoint | null;
  /** Declared profit of the lower option, marked on the x-axis. */
  lowProfit: number;
  /** Declared profit of the higher option, marked on the x-axis. */
  highProfit: number;
}

const WIDTH = 780;
const HEIGHT = 300;
const PAD = { top: 24, right: 20, bottom: 38, left: 76 };

/**
 * Net position plotted against the declared profit. The curve is genuinely
 * kinked — tariff zones and the 2 € replacement-rate steps are step functions —
 * so it is sampled rather than differentiated.
 */
export default function TradeoffChart({ points, optimum, lowProfit, highProfit }: Props) {
  const gradientId = useId();

  if (points.length < 2) {
    return (
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        Not enough data to plot the trade-off.
      </p>
    );
  }

  const xs = points.map((p) => p.annualProfit);
  const ys = points.map((p) => p.netPosition);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  const padding = (yMax - yMin) * 0.12 || 100;
  yMin -= padding;
  yMax += padding;

  const spanX = xMax - xMin || 1;
  const spanY = yMax - yMin || 1;
  const toX = (v: number) => PAD.left + ((v - xMin) / spanX) * (WIDTH - PAD.left - PAD.right);
  const toY = (v: number) => HEIGHT - PAD.bottom - ((v - yMin) / spanY) * (HEIGHT - PAD.top - PAD.bottom);

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.annualProfit).toFixed(1)},${toY(p.netPosition).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${toX(xMax).toFixed(1)},${HEIGHT - PAD.bottom} L${toX(xMin).toFixed(1)},${HEIGHT - PAD.bottom} Z`;

  const gridValues = [0, 1, 2, 3, 4].map((i) => yMin + (spanY * i) / 4);
  const tickValues = [0, 1, 2, 3, 4].map((i) => xMin + (spanX * i) / 4);

  const marker = (value: number, label: string) => (
    <g key={label}>
      <line
        x1={toX(value)}
        y1={PAD.top}
        x2={toX(value)}
        y2={HEIGHT - PAD.bottom}
        stroke="var(--muted)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <text x={toX(value)} y={PAD.top - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--muted)">
        {label}
      </text>
    </g>
  );

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      role="img"
      aria-label={`Net position by declared profit. Best result at ${optimum ? eur(optimum.annualProfit) : 'unknown'}.`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.28} />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
        </linearGradient>
      </defs>

      {gridValues.map((value) => (
        <g key={`y-${value}`}>
          <line x1={PAD.left} y1={toY(value)} x2={WIDTH - PAD.right} y2={toY(value)} stroke="var(--card-border)" strokeWidth={1} />
          <text x={PAD.left - 8} y={toY(value) + 4} textAnchor="end" fontSize={10} fill="var(--muted)">
            {eur(value)}
          </text>
        </g>
      ))}

      {tickValues.map((value) => (
        <text key={`x-${value}`} x={toX(value)} y={HEIGHT - 12} textAnchor="middle" fontSize={10} fill="var(--muted)">
          {eur(value)}
        </text>
      ))}

      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinejoin="round" />

      {marker(lowProfit, 'lower')}
      {marker(highProfit, 'higher')}

      {optimum && (
        <g>
          <circle
            cx={toX(optimum.annualProfit)}
            cy={toY(optimum.netPosition)}
            r={5.5}
            fill="var(--success)"
            stroke="var(--card-bg)"
            strokeWidth={2}
          />
          <text
            x={toX(optimum.annualProfit)}
            y={toY(optimum.netPosition) - 12}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fill="var(--success)"
          >
            {`best ${eur(optimum.annualProfit)}`}
          </text>
        </g>
      )}
    </svg>
  );
}
