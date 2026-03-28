import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calculatePulseAdvanced, applyDecay, levelFromPercentage, PulseState, ActivitySignals } from "./pulse";

interface PulseStore {
  // Session data
  sessionStartTime: number | null;
  minutesActive: number;
  tasksCompletedToday: number;
  totalTasksToday: number;
  // Activity tracking
  lastActivityTime: number;
  inactiveMinutes: number;
  tabVisible: boolean;
  interactionTimestamps: number[];  // timestamps of recent interactions
  lastBreakTime: number | null;     // when the last break started (inactivity gap)
  continuousSessionStart: number;   // start of current unbroken session
  // Streak
  streakDays: number;
  // Pulse state
  pulse: PulseState;
  peakPulse: PulseState;
  // Actions
  startSession: () => void;
  tickSession: () => void;
  recordActivity: () => void;
  recordTaskComplete: () => void;
  setTabVisible: (visible: boolean) => void;
  setTodayStats: (completed: number, total: number) => void;
  setStreak: (days: number) => void;
  resetSession: () => void;
}

const defaultPulse = levelFromPercentage(0);

// Persist session across page refreshes (so it doesn't reset when navigating)
export const usePulseStore = create<PulseStore>()(
  persist(
    (set, get) => ({
      sessionStartTime: null,
      minutesActive: 0,
      tasksCompletedToday: 0,
      totalTasksToday: 0,
      lastActivityTime: Date.now(),
      inactiveMinutes: 0,
      tabVisible: true,
      interactionTimestamps: [],
      lastBreakTime: null,
      continuousSessionStart: Date.now(),
      streakDays: 0,
      pulse: defaultPulse,
      peakPulse: defaultPulse,

      startSession: () => {
        const now = Date.now();
        set({
          sessionStartTime: now,
          minutesActive: 0,
          lastActivityTime: now,
          inactiveMinutes: 0,
          interactionTimestamps: [],
          continuousSessionStart: now,
          lastBreakTime: null,
        });
      },

      tickSession: () => {
        const state = get();
        if (!state.sessionStartTime) return;

        const now = Date.now();
        const totalMins = Math.floor((now - state.sessionStartTime) / 60000);
        const inactiveMins = Math.floor((now - state.lastActivityTime) / 60000);

        // Check timer state directly from the store (avoid localStorage parse every tick)
        const timerRunning = (() => {
          try {
            const stored = localStorage.getItem("tayrona-timer-prefs");
            if (stored) {
              const parsed = JSON.parse(stored);
              return parsed?.state?.isRunning === true;
            }
          } catch { /* ignore */ }
          return false;
        })();

        // Count interactions in last 5 minutes
        const fiveMinAgo = now - 5 * 60 * 1000;
        const recentInteractions = state.interactionTimestamps.filter(t => t > fiveMinAgo).length;

        // Continuous session depth: time since last break or session start
        // A "break" = 10+ min of inactivity without timer
        let continuousStart = state.continuousSessionStart;
        if (inactiveMins >= 10 && !timerRunning) {
          // User took a break — reset continuous session when they come back
          continuousStart = now;
        }
        const sessionDepthMinutes = Math.floor((now - continuousStart) / 60000);

        // Build signals
        const signals: ActivitySignals = {
          minutesActive: totalMins,
          tasksCompleted: state.tasksCompletedToday,
          timerRunning,
          tabVisible: state.tabVisible,
          recentInteractions,
          sessionDepthMinutes,
        };

        // Calculate base pulse from all signals
        let basePulse = calculatePulseAdvanced(signals);

        // Apply decay if inactive (but NOT if timer is running)
        if (inactiveMins >= 5) {
          const decayedPct = applyDecay(
            basePulse.percentage,
            inactiveMins,
            timerRunning,
            state.tabVisible
          );
          basePulse = levelFromPercentage(decayedPct);
        }

        // Track peak
        const newPeak = basePulse.percentage > state.peakPulse.percentage ? basePulse : state.peakPulse;

        // Prune old interaction timestamps (keep only last 10 min)
        const tenMinAgo = now - 10 * 60 * 1000;
        const prunedTimestamps = state.interactionTimestamps.filter(t => t > tenMinAgo);

        set({
          minutesActive: totalMins,
          inactiveMinutes: inactiveMins,
          pulse: basePulse,
          peakPulse: newPeak,
          interactionTimestamps: prunedTimestamps,
          continuousSessionStart: continuousStart,
        });
      },

      recordActivity: () => {
        const now = Date.now();
        const state = get();
        const wasInactive = state.inactiveMinutes >= 10;

        set({
          lastActivityTime: now,
          inactiveMinutes: 0,
          interactionTimestamps: [...state.interactionTimestamps, now],
          // If coming back from a break, reset continuous session
          continuousSessionStart: wasInactive ? now : state.continuousSessionStart,
        });
      },

      recordTaskComplete: () => {
        const state = get();
        const now = Date.now();
        const newCompleted = state.tasksCompletedToday + 1;
        set({
          tasksCompletedToday: newCompleted,
          lastActivityTime: now,
          inactiveMinutes: 0,
          interactionTimestamps: [...state.interactionTimestamps, now],
        });
        // Immediately recalculate pulse
        get().tickSession();
      },

      setTabVisible: (visible) => {
        const now = Date.now();
        set({
          tabVisible: visible,
          // Returning to tab = activity signal
          ...(visible ? { lastActivityTime: now, inactiveMinutes: 0 } : {}),
        });
      },

      setTodayStats: (completed, total) => {
        set({
          tasksCompletedToday: completed,
          totalTasksToday: total,
        });
      },

      setStreak: (days) => set({ streakDays: days }),

      resetSession: () => {
        const now = Date.now();
        set({
          sessionStartTime: now,
          minutesActive: 0,
          tasksCompletedToday: 0,
          lastActivityTime: now,
          inactiveMinutes: 0,
          interactionTimestamps: [],
          continuousSessionStart: now,
          lastBreakTime: null,
          pulse: defaultPulse,
          peakPulse: defaultPulse,
        });
      },
    }),
    {
      name: "tayrona-pulse-session",
      partialize: (state) => ({
        // Persist session across page refreshes/navigation
        sessionStartTime: state.sessionStartTime,
        tasksCompletedToday: state.tasksCompletedToday,
        totalTasksToday: state.totalTasksToday,
        streakDays: state.streakDays,
        peakPulse: state.peakPulse,
        continuousSessionStart: state.continuousSessionStart,
      }),
    }
  )
);
