"use client";

import { PulseState } from "@/lib/pulse";

interface PulseBarProps {
  pulse: PulseState;
}

export default function PulseBar({ pulse }: PulseBarProps) {
  return (
    <div className="w-full bg-bg-primary/50" style={{ height: `${pulse.barHeight}px` }}>
      <div
        className="h-full"
        style={{
          width: `${Math.max(pulse.percentage, 1)}%`,
          backgroundColor: pulse.color,
          borderRadius: `0 ${pulse.barHeight / 2}px ${pulse.barHeight / 2}px 0`,
          transition: "width 0.8s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.6s ease, height 0.4s ease",
        }}
      />
    </div>
  );
}
