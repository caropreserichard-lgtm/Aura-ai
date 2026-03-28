// PULSE BAR — Real-time productivity state system

export type PulseLevel = "warming_up" | "locking_in" | "in_the_zone" | "deep_flow";

export interface PulseState {
  level: PulseLevel;
  percentage: number;    // 0-100
  label: string;
  color: string;
  barHeight: number;     // 6, 7, or 8px
  badgeBg: string;
}

export function calculatePulse(
  minutesActive: number,
  tasksCompleted: number,
  timerRunning: boolean
): PulseState {
  const rawScore =
    (minutesActive * 0.5) +
    (tasksCompleted * 12) +
    (timerRunning ? 8 : 0);

  const percentage = Math.min(Math.round(rawScore), 100);

  if (percentage < 20) {
    return {
      level: "warming_up",
      percentage,
      label: "Warming up...",
      color: "#85B7EB",
      barHeight: 6,
      badgeBg: "rgba(133, 183, 235, 0.10)",
    };
  } else if (percentage < 45) {
    return {
      level: "locking_in",
      percentage,
      label: "Locking in",
      color: "#5DCAA5",
      barHeight: 6,
      badgeBg: "rgba(93, 202, 165, 0.10)",
    };
  } else if (percentage < 75) {
    return {
      level: "in_the_zone",
      percentage,
      label: "In the zone",
      color: "#EF9F27",
      barHeight: 7,
      badgeBg: "rgba(239, 159, 39, 0.10)",
    };
  } else {
    return {
      level: "deep_flow",
      percentage,
      label: "Deep flow",
      color: "#D4537E",
      barHeight: 8,
      badgeBg: "rgba(212, 83, 126, 0.12)",
    };
  }
}

export function applyDecay(currentPercentage: number, inactiveMinutes: number): number {
  if (inactiveMinutes < 5) return currentPercentage;
  const decayRate = inactiveMinutes > 15 ? 4 : 2;
  const decayed = currentPercentage - ((inactiveMinutes - 5) * decayRate);
  return Math.max(decayed, 5);
}
