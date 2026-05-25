"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type DeepWorkState = "idle" | "working" | "break" | "completed";

interface DeepWorkConfig {
  sessionMinutes: number;
  breakMinutes: number;
  totalSessions: number;
}

interface DeepWorkReturn {
  state: DeepWorkState;
  secondsLeft: number;
  currentSession: number;
  totalSessions: number;
  totalTimeWorked: number;
  isPaused: boolean;
  config: DeepWorkConfig;
  setConfig: (config: DeepWorkConfig) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skipBreak: () => void;
}

function playSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 528;
    osc.type = "sine";
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc.stop(ctx.currentTime + 1.5);
  } catch {
    // Audio not available
  }
}

/**
 * Timer model: wall-clock anchored.
 *
 * Each phase (working / break) records the absolute Date.now() timestamp at
 * which it ends in `phaseEndRef`. The display ticks every 250ms and recomputes
 * `secondsLeft = ceil((phaseEnd - now) / 1000)` from real time — never by
 * decrementing. This makes the timer immune to:
 *   - Background-tab throttling (setInterval slowed to ~1/min on hidden tabs)
 *   - Mobile browser power saving
 *   - Variable interval drift over long sessions
 *
 * Pausing snapshots the remaining ms; resuming rebuilds phaseEndRef.
 */
export function useDeepWork(): DeepWorkReturn {
  const [state, setState] = useState<DeepWorkState>("idle");
  const [config, setConfigState] = useState<DeepWorkConfig>({
    sessionMinutes: 50,
    breakMinutes: 10,
    totalSessions: 4,
  });
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [currentSession, setCurrentSession] = useState(1);
  const [totalTimeWorked, setTotalTimeWorked] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Refs that survive re-renders without causing them.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseEndRef = useRef<number | null>(null);          // wall-clock ms
  const pausedRemainingMsRef = useRef<number | null>(null); // when paused
  const phaseDurationMsRef = useRef<number>(0);             // for completion accounting
  const onCompleteRef = useRef<(() => void) | null>(null);
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);
  const currentSessionRef = useRef(currentSession);
  useEffect(() => { currentSessionRef.current = currentSession; }, [currentSession]);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /** Recompute display from wall clock; fire onComplete when zero. */
  const tick = useCallback(() => {
    const end = phaseEndRef.current;
    if (end == null) return;
    const remainingMs = end - Date.now();
    if (remainingMs <= 0) {
      setSecondsLeft(0);
      clearTick();
      phaseEndRef.current = null;
      const cb = onCompleteRef.current;
      onCompleteRef.current = null;
      playSound();
      cb?.();
      return;
    }
    setSecondsLeft(Math.ceil(remainingMs / 1000));
  }, [clearTick]);

  /** Start a phase: anchor end-time, kick a 250ms recompute loop. */
  const runPhase = useCallback(
    (durationSeconds: number, onComplete: () => void) => {
      clearTick();
      const durMs = Math.max(0, Math.floor(durationSeconds * 1000));
      phaseDurationMsRef.current = durMs;
      phaseEndRef.current = Date.now() + durMs;
      onCompleteRef.current = onComplete;
      pausedRemainingMsRef.current = null;
      setIsPaused(false);
      setSecondsLeft(Math.ceil(durMs / 1000));
      // Tick at 250ms for smooth UI without burning CPU. Even if the browser
      // throttles to 1Hz or 0.016Hz (background), display stays accurate
      // because we recompute against Date.now() rather than decrementing.
      intervalRef.current = setInterval(tick, 250);
    },
    [clearTick, tick],
  );

  // --- Phase orchestration (mutually-recursive via refs to avoid stale closures) ---
  const startWorkRef = useRef<() => void>(() => {});
  const startBreakRef = useRef<() => void>(() => {});

  const startWork = useCallback(() => {
    setState("working");
    stateRef.current = "working";
    runPhase(configRef.current.sessionMinutes * 60, () => {
      // Session ended naturally — credit full duration.
      setTotalTimeWorked((p) => p + configRef.current.sessionMinutes * 60);
      if (currentSessionRef.current >= configRef.current.totalSessions) {
        setState("completed");
        stateRef.current = "completed";
      } else {
        startBreakRef.current();
      }
    });
  }, [runPhase]);

  const startBreak = useCallback(() => {
    setState("break");
    stateRef.current = "break";
    runPhase(configRef.current.breakMinutes * 60, () => {
      const next = currentSessionRef.current + 1;
      if (next > configRef.current.totalSessions) {
        setState("completed");
        stateRef.current = "completed";
      } else {
        setCurrentSession(next);
        currentSessionRef.current = next;
        startWorkRef.current();
      }
    });
  }, [runPhase]);

  useEffect(() => {
    startWorkRef.current = startWork;
    startBreakRef.current = startBreak;
  }, [startWork, startBreak]);

  const start = useCallback(() => {
    setCurrentSession(1);
    currentSessionRef.current = 1;
    setTotalTimeWorked(0);
    startWork();
  }, [startWork]);

  const pause = useCallback(() => {
    if (phaseEndRef.current == null) return;
    const remainingMs = Math.max(0, phaseEndRef.current - Date.now());
    pausedRemainingMsRef.current = remainingMs;
    phaseEndRef.current = null;
    clearTick();
    setIsPaused(true);
    setSecondsLeft(Math.ceil(remainingMs / 1000));
  }, [clearTick]);

  const resume = useCallback(() => {
    const remainingMs = pausedRemainingMsRef.current;
    if (remainingMs == null || remainingMs <= 0) return;
    phaseEndRef.current = Date.now() + remainingMs;
    pausedRemainingMsRef.current = null;
    setIsPaused(false);
    intervalRef.current = setInterval(tick, 250);
  }, [tick]);

  const stop = useCallback(() => {
    // Credit partial time spent in this working phase before stopping.
    if (stateRef.current === "working") {
      let workedMs = 0;
      if (pausedRemainingMsRef.current != null) {
        workedMs = phaseDurationMsRef.current - pausedRemainingMsRef.current;
      } else if (phaseEndRef.current != null) {
        workedMs = phaseDurationMsRef.current - Math.max(0, phaseEndRef.current - Date.now());
      }
      const partialSeconds = Math.max(0, Math.floor(workedMs / 1000));
      if (partialSeconds > 0) setTotalTimeWorked((p) => p + partialSeconds);
    }
    clearTick();
    phaseEndRef.current = null;
    pausedRemainingMsRef.current = null;
    onCompleteRef.current = null;
    setState("completed");
    stateRef.current = "completed";
  }, [clearTick]);

  const skipBreak = useCallback(() => {
    clearTick();
    phaseEndRef.current = null;
    onCompleteRef.current = null;
    const next = currentSessionRef.current + 1;
    if (next > configRef.current.totalSessions) {
      setState("completed");
      stateRef.current = "completed";
      return;
    }
    setCurrentSession(next);
    currentSessionRef.current = next;
    startWork();
  }, [clearTick, startWork]);

  // Re-sync immediately when the tab becomes visible again (defense-in-depth;
  // the wall-clock anchor already keeps us accurate, this just snaps the UI).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && phaseEndRef.current != null) {
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [tick]);

  // Cleanup
  useEffect(() => () => clearTick(), [clearTick]);

  // Stable setConfig (so callers can spread previous config without infinite loops)
  const setConfig = useCallback((next: DeepWorkConfig) => {
    setConfigState(next);
  }, []);

  return {
    state,
    secondsLeft,
    currentSession,
    totalSessions: config.totalSessions,
    totalTimeWorked,
    isPaused,
    config,
    setConfig,
    start,
    pause,
    resume,
    stop,
    skipBreak,
  };
}
