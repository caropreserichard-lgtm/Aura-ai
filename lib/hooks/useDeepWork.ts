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

export function useDeepWork(): DeepWorkReturn {
  const [state, setState] = useState<DeepWorkState>("idle");
  const [config, setConfig] = useState<DeepWorkConfig>({
    sessionMinutes: 50,
    breakMinutes: 10,
    totalSessions: 4,
  });
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [currentSession, setCurrentSession] = useState(1);
  const [totalTimeWorked, setTotalTimeWorked] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const workingSecondsRef = useRef(0);

  const clearInterval_ = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (durationSeconds: number, onComplete: () => void) => {
      clearInterval_();
      setSecondsLeft(durationSeconds);
      setIsPaused(false);

      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval_();
            playSound();
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [clearInterval_]
  );

  const startBreak = useCallback(() => {
    setState("break");
    startTimer(config.breakMinutes * 60, () => {
      // Break done — start next session or complete
      const next = currentSession + 1;
      if (next > config.totalSessions) {
        setState("completed");
      } else {
        setCurrentSession(next);
        setState("working");
        workingSecondsRef.current = 0;
        startTimer(config.sessionMinutes * 60, () => {
          setTotalTimeWorked((prev) => prev + config.sessionMinutes * 60);
          startBreak();
        });
      }
    });
  }, [config, currentSession, startTimer]);

  const startWorkSession = useCallback(() => {
    setState("working");
    workingSecondsRef.current = 0;

    // Track working seconds
    const trackInterval = setInterval(() => {
      workingSecondsRef.current += 1;
    }, 1000);

    startTimer(config.sessionMinutes * 60, () => {
      clearInterval(trackInterval);
      setTotalTimeWorked((prev) => prev + config.sessionMinutes * 60);

      if (currentSession >= config.totalSessions) {
        setState("completed");
      } else {
        startBreak();
      }
    });

    // Store tracking interval to clean up on unmount
    return trackInterval;
  }, [config, currentSession, startTimer, startBreak]);

  const start = useCallback(() => {
    setCurrentSession(1);
    setTotalTimeWorked(0);
    startWorkSession();
  }, [startWorkSession]);

  const pause = useCallback(() => {
    clearInterval_();
    setIsPaused(true);
  }, [clearInterval_]);

  const resume = useCallback(() => {
    setIsPaused(false);
    const currentState = state;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval_();
          playSound();

          if (currentState === "working") {
            setTotalTimeWorked((p) => p + config.sessionMinutes * 60);
            if (currentSession >= config.totalSessions) {
              setState("completed");
            } else {
              // Will trigger break via effect
              setState("break");
              // Manually start break timer
              setTimeout(() => {
                startTimer(config.breakMinutes * 60, () => {
                  const next = currentSession + 1;
                  if (next > config.totalSessions) {
                    setState("completed");
                  } else {
                    setCurrentSession(next);
                    setState("working");
                    startTimer(config.sessionMinutes * 60, () => {
                      setTotalTimeWorked((p2) => p2 + config.sessionMinutes * 60);
                    });
                  }
                });
              }, 100);
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearInterval_, state, config, currentSession, startTimer]);

  const stop = useCallback(() => {
    clearInterval_();
    // Add partial time worked in this session
    const partialSeconds = config.sessionMinutes * 60 - secondsLeft;
    if (state === "working" && partialSeconds > 0) {
      setTotalTimeWorked((prev) => prev + partialSeconds);
    }
    setState("completed");
  }, [clearInterval_, config.sessionMinutes, secondsLeft, state]);

  const skipBreak = useCallback(() => {
    clearInterval_();
    const next = currentSession + 1;
    if (next > config.totalSessions) {
      setState("completed");
    } else {
      setCurrentSession(next);
      setState("working");
      workingSecondsRef.current = 0;
      startTimer(config.sessionMinutes * 60, () => {
        setTotalTimeWorked((prev) => prev + config.sessionMinutes * 60);
        if (next >= config.totalSessions) {
          setState("completed");
        } else {
          startBreak();
        }
      });
    }
  }, [clearInterval_, currentSession, config, startTimer, startBreak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearInterval_();
  }, [clearInterval_]);

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
