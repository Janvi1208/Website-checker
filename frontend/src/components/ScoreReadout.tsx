"use client";

interface ScoreReadoutProps {
  label: string;
  value: number; // 0-100
  unit?: string;
}

function scoreColor(value: number): string {
  if (value >= 75) return "#3DDC84"; // signal
  if (value >= 50) return "#5B8DEF"; // data
  if (value >= 25) return "#FFB454"; // amber, used only here for mid-low
  return "#FF6B5E"; // alert
}

export function ScoreReadout({ label, value, unit = "" }: ScoreReadoutProps) {
  const color = scoreColor(value);
  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="#2C3543"
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-lg font-medium text-ivory tabular-nums">
            {value}
            {unit}
          </span>
        </div>
      </div>
      <span className="readout-label text-center">{label}</span>
    </div>
  );
}
