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
  // Timestamp-based tracking (survives tab throttling)
  _startedAt: number | null;      // Date.now() when timer was started/resumed
  _pausedRemaining: number | null; // seconds left when paused
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
      _startedAt: null,
      _pausedRemaining: null,
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
          _startedAt: Date.now(),
          _pausedRemaining: null,
        });
      },

      pauseTimer: () => {
        const state = get();
        // Snapshot the actual remaining based on timestamps
        const remaining = state._startedAt
          ? Math.max(0, state.totalSeconds - Math.floor((Date.now() - state._startedAt) / 1000))
          : state.remainingSeconds;
        set({
          isRunning: false,
          remainingSeconds: remaining,
          _pausedRemaining: remaining,
          _startedAt: null,
        });
      },

      resumeTimer: () => {
        const state = get();
        const remaining = state._pausedRemaining ?? state.remainingSeconds;
        if (remaining > 0 && !state.isFinished) {
          // _startedAt = now, but we're resuming with `remaining` seconds left
          // So _startedAt should be set so that totalSeconds - elapsed = remaining
          // elapsed = totalSeconds - remaining → _startedAt = now - elapsed*1000
          const elapsed = state.totalSeconds - remaining;
          set({
            isRunning: true,
            remainingSeconds: remaining,
            _startedAt: Date.now() - elapsed * 1000,
            _pausedRemaining: null,
          });
        }
      },

      stopTimer: () =>
        set({
          taskId: null, taskTitle: "", totalSeconds: 0, remainingSeconds: 0,
          isRunning: false, isFinished: false, isWidgetVisible: false,
          _startedAt: null, _pausedRemaining: null,
        }),

      tick: () => {
        const state = get();
        if (!state.isRunning || !state._startedAt) return;

        // Calculate remaining from timestamps — immune to tab throttling
        const elapsedSecs = Math.floor((Date.now() - state._startedAt) / 1000);
        const remaining = Math.max(0, state.totalSeconds - elapsedSecs);

        if (remaining <= 0) {
          set({ remainingSeconds: 0, isRunning: false, isFinished: true, _startedAt: null });
        } else {
          set({ remainingSeconds: remaining });
        }
      },

      addTime: (minutes) => {
        const state = get();
        const addSec = minutes * 60;
        const newTotal = state.totalSeconds + addSec;
        const newRemaining = state.remainingSeconds + addSec;
        set({
          totalSeconds: newTotal,
          remainingSeconds: newRemaining,
          isFinished: false,
          // If paused, update _pausedRemaining too
          _pausedRemaining: state._pausedRemaining != null ? newRemaining : null,
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
        // Persist running timer state so it survives full page reload
        taskId: state.taskId,
        taskTitle: state.taskTitle,
        totalSeconds: state.totalSeconds,
        isRunning: state.isRunning,
        isWidgetVisible: state.isWidgetVisible,
        _startedAt: state._startedAt,
        _pausedRemaining: state._pausedRemaining,
      }),
    }
  )
);
