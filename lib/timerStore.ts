import { create } from "zustand";

export interface TimerState {
  // Current task info
  taskId: string | null;
  taskTitle: string;
  // Timer config
  totalSeconds: number; // countdown from this
  remainingSeconds: number;
  isRunning: boolean;
  isFinished: boolean;
  // Widget visibility
  isWidgetVisible: boolean;
  // Actions
  startTimer: (taskId: string, taskTitle: string, minutes: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  tick: () => void;
  hideWidget: () => void;
  showWidget: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  taskId: null,
  taskTitle: "",
  totalSeconds: 0,
  remainingSeconds: 0,
  isRunning: false,
  isFinished: false,
  isWidgetVisible: false,

  startTimer: (taskId, taskTitle, minutes) => {
    const totalSeconds = minutes * 60;
    set({
      taskId,
      taskTitle,
      totalSeconds,
      remainingSeconds: totalSeconds,
      isRunning: true,
      isFinished: false,
      isWidgetVisible: true,
    });
  },

  pauseTimer: () => set({ isRunning: false }),

  resumeTimer: () => {
    const state = get();
    if (state.remainingSeconds > 0 && !state.isFinished) {
      set({ isRunning: true });
    }
  },

  stopTimer: () =>
    set({
      taskId: null,
      taskTitle: "",
      totalSeconds: 0,
      remainingSeconds: 0,
      isRunning: false,
      isFinished: false,
      isWidgetVisible: false,
    }),

  tick: () => {
    const state = get();
    if (!state.isRunning || state.remainingSeconds <= 0) return;
    const next = state.remainingSeconds - 1;
    if (next <= 0) {
      set({ remainingSeconds: 0, isRunning: false, isFinished: true });
    } else {
      set({ remainingSeconds: next });
    }
  },

  hideWidget: () => set({ isWidgetVisible: false }),
  showWidget: () => set({ isWidgetVisible: true }),
}));
