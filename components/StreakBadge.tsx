"use client";

interface StreakBadgeProps { streak: number; }

export default function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) return null;
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning-subtle border border-warning/20">
      <span className="text-sm">{"\uD83D\uDD25"}</span>
      <span className="font-mono font-semibold text-xs text-warning">{streak}d streak</span>
    </div>
  );
}
