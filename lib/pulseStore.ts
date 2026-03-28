import { create } from "zustand";
import { calculatePulse, applyDecay, PulseState } from "./pulse";

interface PulseStore {
  // Session data
  sessionStartTime: number | null;
  minutesActive: number;
  tasksCompletedToday: number;
  totalTasksToday: number;
  lastActivityTime: number;
  inactiveMinutes: number;
  // Streak
  streakDays: number;
  // Pulse state
  pulse: PulseState;
  peakPulse: PulseState;
  // Actions
  startSession: () => void;
  tickSession: () => void;
  recordTaskComplete: () => void;
  setTodayStats: (completed: number, total: number) => void;
  setStreak: (days: number) => void;
  resetSession: () => void;
}

const defaultPulse = calculatePulse(0, 0, false);

export const usePulseStore = create<PulseStore>((set, get) => ({
  sessionStartTime: null,
  minutesActive: 0,
  tasksCompletedToday: 0,
  totalTasksToday: 0,
  lastActivityTime: Date.now(),
  inactiveMinutes: 0,
  streakDays: 0,
  pulse: defaultPulse,
  peakPulse: defaultPulse,

  startSession: () => {
    set({
      sessionStartTime: Date.now(),
      minutesActive: 0,
      lastActivityTime: Date.now(),
      inactiveMinutes: 0,
    });
  },

  tickSession: () => {
    const state = get();
    if (!state.sessionStartTime) return;

    const now = Date.now();
    const totalMins = Math.floor((now - state.sessionStartTime) / 60000);
    const inactiveMins = Math.floor((now - state.lastActivityTime) / 60000);

    // Calculate base pulse
    const timerRunning = typeof window !== "undefined" && (() => {
      try {
        const stored = localStorage.getItem("tayrona-timer-prefs");
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed?.state?.isRunning === true;
        }
      } catch { /* ignore */ }
      return false;
    })();

    let basePulse = calculatePulse(totalMins, state.tasksCompletedToday, timerRunning);

    // Apply decay if inactive
    if (inactiveMins >= 5) {
      const decayedPct = applyDecay(basePulse.percentage, inactiveMins);
      basePulse = calculatePulse(0, 0, false); // recalc from percentage
      // Override percentage manually
      basePulse = { ...basePulse, percentage: decayedPct };
      // Recategorize level based on decayed percentage
      if (decayedPct < 20) {
        basePulse = { ...basePulse, level: "warming_up", label: "Warming up...", color: "#85B7EB", barHeight: 6, badgeBg: "rgba(133, 183, 235, 0.10)" };
      } else if (decayedPct < 45) {
        basePulse = { ...basePulse, level: "locking_in", label: "Locking in", color: "#5DCAA5", barHeight: 6, badgeBg: "rgba(93, 202, 165, 0.10)" };
      } else if (decayedPct < 75) {
        basePulse = { ...basePulse, level: "in_the_zone", label: "In the zone", color: "#EF9F27", barHeight: 7, badgeBg: "rgba(239, 159, 39, 0.10)" };
      } else {
        basePulse = { ...basePulse, level: "deep_flow", label: "Deep flow", color: "#D4537E", barHeight: 8, badgeBg: "rgba(212, 83, 126, 0.12)" };
      }
    }

    const currentPeak = state.peakPulse;
    const newPeak = basePulse.percentage > currentPeak.percentage ? basePulse : currentPeak;

    set({
      minutesActive: totalMins,
      inactiveMinutes: inactiveMins,
      pulse: basePulse,
      peakPulse: newPeak,
    });
  },

  recordTaskComplete: () => {
    const state = get();
    const newCompleted = state.tasksCompletedToday + 1;
    set({
      tasksCompletedToday: newCompleted,
      lastActivityTime: Date.now(),
      inactiveMinutes: 0,
    });
    // Immediately recalculate pulse
    get().tickSession();
  },

  setTodayStats: (completed, total) => {
    set({
      tasksCompletedToday: completed,
      totalTasksToday: total,
      lastActivityTime: Date.now(),
    });
  },

  setStreak: (days) => set({ streakDays: days }),

  resetSession: () => {
    set({
      sessionStartTime: Date.now(),
      minutesActive: 0,
      tasksCompletedToday: 0,
      lastActivityTime: Date.now(),
      inactiveMinutes: 0,
      pulse: defaultPulse,
      peakPulse: defaultPulse,
    });
  },
}));
