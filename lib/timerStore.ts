import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WidgetSize = "compact" | "normal" | "large";
export type WidgetShape = "rounded" | "pill" | "square";
export type DialStyle = "cenital" | "piedra" | "eclipse";
export type TimerTheme = "dorado" | "luna" | "amatista";
export type TimerBackground = "pizarra" | "cielo" | "mural";

export interface TimerState {
  taskId: string | null;
  taskTitle: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isFinished: boolean;
  isWidgetVisible: boolean;
  // Preferences (persisted)
  soundId: string;
  widgetSize: WidgetSize;
  widgetShape: WidgetShape;
  widgetOpacity: number;
  dialStyle: DialStyle;
  timerTheme: TimerTheme;
  timerBackground: TimerBackground;
  // Actions
  startTimer: (taskId: string, taskTitle: string, minutes: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  tick: () => void;
  hideWidget: () => void;
  showWidget: () => void;
  addTime: (minutes: number) => void;
  setSoundId: (id: string) => void;
  setWidgetSize: (size: WidgetSize) => void;
  setWidgetShape: (shape: WidgetShape) => void;
  setWidgetOpacity: (opacity: number) => void;
  setDialStyle: (style: DialStyle) => void;
  setTimerTheme: (theme: TimerTheme) => void;
  setTimerBackground: (bg: TimerBackground) => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      taskId: null,
      taskTitle: "",
      totalSeconds: 0,
      remainingSeconds: 0,
      isRunning: false,
      isFinished: false,
      isWidgetVisible: false,
      soundId: "zen-bell",
      widgetSize: "normal" as WidgetSize,
      widgetShape: "rounded" as WidgetShape,
      widgetOpacity: 0.75,
      dialStyle: "cenital" as DialStyle,
      timerTheme: "dorado" as TimerTheme,
      timerBackground: "pizarra" as TimerBackground,

      startTimer: (taskId, taskTitle, minutes) => {
        const totalSeconds = minutes * 60;
        set({
          taskId, taskTitle, totalSeconds,
          remainingSeconds: totalSeconds,
          isRunning: true, isFinished: false, isWidgetVisible: true,
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
          taskId: null, taskTitle: "", totalSeconds: 0, remainingSeconds: 0,
          isRunning: false, isFinished: false, isWidgetVisible: false,
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

      addTime: (minutes) => {
        const state = get();
        const addSec = minutes * 60;
        set({
          totalSeconds: state.totalSeconds + addSec,
          remainingSeconds: state.remainingSeconds + addSec,
          isFinished: false,
        });
      },

      hideWidget: () => set({ isWidgetVisible: false }),
      showWidget: () => set({ isWidgetVisible: true }),
      setSoundId: (id) => set({ soundId: id }),
      setWidgetSize: (size) => set({ widgetSize: size }),
      setWidgetShape: (shape) => set({ widgetShape: shape }),
      setWidgetOpacity: (opacity) => set({ widgetOpacity: opacity }),
      setDialStyle: (style) => set({ dialStyle: style }),
      setTimerTheme: (theme) => set({ timerTheme: theme }),
      setTimerBackground: (bg) => set({ timerBackground: bg }),
    }),
    {
      name: "tayrona-timer-prefs",
      partialize: (state) => ({
        soundId: state.soundId,
        widgetSize: state.widgetSize,
        widgetShape: state.widgetShape,
        widgetOpacity: state.widgetOpacity,
        dialStyle: state.dialStyle,
        timerTheme: state.timerTheme,
        timerBackground: state.timerBackground,
      }),
    }
  )
);
