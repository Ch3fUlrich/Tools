/* global setInterval, clearInterval */
"use client";

import { useState, useEffect, useCallback } from "react";

interface RestTimerProps {
  durationSeconds: number;
  onComplete: () => void;
  onDismiss: () => void;
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getColor(remaining: number, total: number): string {
  const ratio = remaining / total;
  if (ratio > 0.5) return "#22c55e"; // green
  if (ratio > 0.25) return "#eab308"; // yellow
  return "#ef4444"; // red
}

export default function RestTimer({
  durationSeconds,
  onComplete,
  onDismiss,
}: RestTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (remaining <= 0) {
      handleComplete();
      return;
    }

    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [remaining, handleComplete]);

  const offset = CIRCUMFERENCE * (1 - remaining / durationSeconds);
  const color = getColor(remaining, durationSeconds);

  return (
    <div className="flex flex-col items-center gap-4 inline-block">
      <svg viewBox="0 0 120 120" width={160} height={160}>
        {/* Background circle */}
        <circle
          cx={60}
          cy={60}
          r={RADIUS}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={8}
        />
        {/* Progress ring */}
        <circle
          cx={60}
          cy={60}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.3s ease, stroke 0.3s ease" }}
        />
        {/* Time text */}
        <text
          x={60}
          y={60}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={22}
          fontWeight="bold"
          className="fill-slate-900 dark:fill-white"
        >
          {formatTime(remaining)}
        </text>
      </svg>

      <button
        type="button"
        onClick={onDismiss}
        className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        Skip
      </button>
    </div>
  );
}
