"use client";

interface XPBarProps {
  level: number;
  progress: number; // 0-1
  xpInLevel: number;
  totalXP: number;
}

export default function XPBar({
  level,
  progress,
  xpInLevel,
  totalXP,
}: XPBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-heading font-bold text-sm text-accent-purple">
            Nivel {level}
          </span>
          <span className="font-mono text-xs text-text-muted">
            {totalXP.toLocaleString()} XP total
          </span>
        </div>
        <span className="font-mono text-xs text-text-secondary">
          {xpInLevel}/500 XP
        </span>
      </div>
      <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full xp-gradient rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}
