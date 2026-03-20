"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type TimerMode = "flow" | "pomodoro";

interface UseTimerOptions {
  onComplete?: () => void;
  onTick?: (seconds: number) => void;
}

export function useTimer(options?: UseTimerOptions) {
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [pomodoroDuration, setPomodoroDuration] = useState(25 * 60); // 25 min default
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        const next = mode === "flow" ? prev + 1 : prev - 1;
        accumulatedRef.current += 1;
        options?.onTick?.(accumulatedRef.current);

        // Pomodoro complete
        if (mode === "pomodoro" && next <= 0) {
          clearTimer();
          setIsRunning(false);
          playNotificationSound();
          options?.onComplete?.();
          return 0;
        }

        return next;
      });
    }, 1000);
  }, [isRunning, mode, clearTimer, options]);

  const pause = useCallback(() => {
    setIsRunning(false);
    clearTimer();
  }, [clearTimer]);

  const reset = useCallback(() => {
    pause();
    setSeconds(mode === "pomodoro" ? pomodoroDuration : 0);
    const accumulated = accumulatedRef.current;
    accumulatedRef.current = 0;
    return accumulated;
  }, [mode, pomodoroDuration, pause]);

  const switchMode = useCallback(
    (newMode: TimerMode) => {
      pause();
      setMode(newMode);
      accumulatedRef.current = 0;
      setSeconds(newMode === "pomodoro" ? pomodoroDuration : 0);
    },
    [pomodoroDuration, pause]
  );

  const setDuration = useCallback(
    (minutes: number) => {
      const secs = minutes * 60;
      setPomodoroDuration(secs);
      if (!isRunning && mode === "pomodoro") {
        setSeconds(secs);
      }
    },
    [isRunning, mode]
  );

  const focusTask = useCallback(
    (id: string) => {
      setTaskId(id);
      reset();
    },
    [reset]
  );

  // Initialize seconds based on mode
  useEffect(() => {
    if (!isRunning) {
      setSeconds(mode === "pomodoro" ? pomodoroDuration : 0);
    }
  }, [mode, pomodoroDuration, isRunning]);

  // Cleanup
  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  return {
    mode,
    seconds,
    isRunning,
    taskId,
    accumulated: accumulatedRef.current,
    start,
    pause,
    reset,
    switchMode,
    setDuration,
    focusTask,
    setTaskId,
  };
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.frequency.value = 523.25; // C5
    oscillator.type = "sine";
    gain.gain.value = 0.3;

    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    oscillator.stop(ctx.currentTime + 0.8);

    // Second tone
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 659.25; // E5
      osc2.type = "sine";
      gain2.gain.value = 0.3;
      osc2.start();
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc2.stop(ctx.currentTime + 0.8);
    }, 200);
  } catch {
    // Audio not available
  }
}
