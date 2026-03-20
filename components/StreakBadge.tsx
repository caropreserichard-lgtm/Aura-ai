"use client";

interface StreakBadgeProps {
  streak: number;
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 animate-pulse-glow">
      <span className="text-lg">{"\uD83D\uDD25"}</span>
      <span className="font-mono font-bold text-sm text-red-400">
        {streak} {streak === 1 ? "día" : "días"}
      </span>
    </div>
  );
}
