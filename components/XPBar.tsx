"use client";

interface XPBarProps {
  level: number;
  progress: number;
  xpInLevel: number;
  totalXP: number;
}

export default function XPBar({ level, progress, xpInLevel, totalXP }: XPBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-heading font-semibold text-sm text-accent-text">Level {level}</span>
          <span className="font-mono text-[11px] text-text-muted">{totalXP.toLocaleString()} XP</span>
        </div>
        <span className="font-mono text-[11px] text-text-secondary">{xpInLevel}/500</span>
      </div>
      <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out bg-accent"
          style={{ width: `${Math.min(progress * 100, 100)}%` }} />
      </div>
    </div>
  );
}
