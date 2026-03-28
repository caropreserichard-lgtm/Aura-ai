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

export interface ActivitySignals {
  minutesActive: number;
  tasksCompleted: number;
  timerRunning: boolean;
  tabVisible: boolean;
  recentInteractions: number;  // interactions in last 5 min
  sessionDepthMinutes: number; // how long user has been in continuous session
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
  return levelFromPercentage(percentage);
}

/**
 * Advanced pulse calculation using all activity signals
 */
export function calculatePulseAdvanced(signals: ActivitySignals): PulseState {
  let score = 0;

  // Base: time in session (diminishing returns after 60min)
  const timeScore = signals.minutesActive <= 60
    ? signals.minutesActive * 0.5
    : 30 + (signals.minutesActive - 60) * 0.2;
  score += timeScore;

  // Tasks completed: each one is a strong signal
  score += signals.tasksCompleted * 12;

  // Timer running: strong engagement signal
  if (signals.timerRunning) score += 10;

  // Tab visible: mild positive signal
  if (signals.tabVisible) score += 2;

  // Recent interaction density: rewards consistent engagement
  // 0 interactions = 0, 1-5 = +3, 6-15 = +6, 16+ = +8
  if (signals.recentInteractions >= 16) score += 8;
  else if (signals.recentInteractions >= 6) score += 6;
  else if (signals.recentInteractions >= 1) score += 3;

  // Session depth bonus: rewards long uninterrupted sessions
  // After 30min continuous, bonus starts; maxes at 90min
  if (signals.sessionDepthMinutes >= 30) {
    const depthBonus = Math.min((signals.sessionDepthMinutes - 30) * 0.15, 9);
    score += depthBonus;
  }

  const percentage = Math.min(Math.round(score), 100);
  return levelFromPercentage(percentage);
}

export function levelFromPercentage(percentage: number): PulseState {
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

/**
 * Smarter decay: considers timer state and tab visibility
 */
export function applyDecay(
  currentPercentage: number,
  inactiveMinutes: number,
  timerRunning: boolean = false,
  tabVisible: boolean = true
): number {
  // RULE: If timer is running, NO decay — user is working outside the app
  if (timerRunning) return currentPercentage;

  // If inactive less than 5 min, no decay yet (grace period)
  if (inactiveMinutes < 5) return currentPercentage;

  // Tab hidden + no timer = faster decay (user left)
  // Tab visible + no interaction = slower decay (maybe reading/thinking)
  let decayRate: number;

  if (!tabVisible) {
    // Tab hidden, no timer → user probably left
    decayRate = inactiveMinutes > 10 ? 5 : 3;
  } else {
    // Tab visible but no clicks → maybe reading, thinking
    decayRate = inactiveMinutes > 15 ? 3 : 1.5;
  }

  const decayed = currentPercentage - ((inactiveMinutes - 5) * decayRate);
  return Math.max(decayed, 5);
}
