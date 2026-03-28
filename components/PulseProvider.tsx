"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePulseStore } from "@/lib/pulseStore";

// Throttle helper — at most once per `ms` milliseconds
function useThrottle(fn: () => void, ms: number) {
  const lastCall = useRef(0);
  return useCallback(() => {
    const now = Date.now();
    if (now - lastCall.current >= ms) {
      lastCall.current = now;
      fn();
    }
  }, [fn, ms]);
}

export default function PulseProvider({ children }: { children: React.ReactNode }) {
  const {
    sessionStartTime,
    startSession,
    tickSession,
    recordActivity,
    setTabVisible,
    setTodayStats,
    setStreak,
  } = usePulseStore();

  // ─── 1. Start session on mount ───────────────────────────
  useEffect(() => {
    const state = usePulseStore.getState();
    if (!state.sessionStartTime) {
      startSession();
    } else {
      // Session exists (persisted) — check if it's from today
      const sessionDate = new Date(state.sessionStartTime).toDateString();
      const todayDate = new Date().toDateString();
      if (sessionDate !== todayDate) {
        // New day → reset session
        startSession();
      }
    }
  }, [sessionStartTime, startSession]);

  // ─── 2. Tick every 30 seconds ────────────────────────────
  useEffect(() => {
    tickSession(); // immediate tick
    const interval = setInterval(() => tickSession(), 30000);
    return () => clearInterval(interval);
  }, [tickSession]);

  // ─── 3. Fetch today's stats from API ─────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats/pulse");
      if (res.ok) {
        const data = await res.json();
        setTodayStats(data.tasksCompletedToday || 0, data.totalTasksToday || 0);
        setStreak(data.streakDays || 0);
      }
    } catch { /* ignore */ }
  }, [setTodayStats, setStreak]);

  useEffect(() => {
    fetchStats();
    const iv = setInterval(fetchStats, 120000); // every 2 min
    return () => clearInterval(iv);
  }, [fetchStats]);

  // ─── 4. Activity tracking — all signals ──────────────────

  // Throttled activity recorder (max once per 3 seconds to avoid spam)
  const throttledActivity = useThrottle(recordActivity, 3000);

  useEffect(() => {
    // --- Mouse & touch interactions ---
    const handleInteraction = () => throttledActivity();

    // Click: intentional interaction
    window.addEventListener("click", handleInteraction, { passive: true });
    // Keydown: typing, shortcuts
    window.addEventListener("keydown", handleInteraction, { passive: true });
    // Mouse move: user is present (throttled, so won't spam)
    window.addEventListener("mousemove", handleInteraction, { passive: true });
    // Scroll: user is reading/navigating
    window.addEventListener("scroll", handleInteraction, { passive: true, capture: true });
    // Touch: mobile interactions
    window.addEventListener("touchstart", handleInteraction, { passive: true });
    // Resize: user adjusting window
    window.addEventListener("resize", handleInteraction, { passive: true });

    // --- Tab visibility ---
    const handleVisibility = () => {
      const visible = document.visibilityState === "visible";
      setTabVisible(visible);
      if (visible) {
        // Returning to tab is a strong activity signal
        recordActivity();
        // Refresh stats when user comes back
        fetchStats();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // --- Focus/blur of window (handles alt-tab, etc.) ---
    const handleFocus = () => {
      setTabVisible(true);
      recordActivity();
    };
    const handleBlur = () => {
      setTabVisible(false);
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // --- Page unload: save state before leaving ---
    const handleBeforeUnload = () => {
      // Force a final tick to persist state
      usePulseStore.getState().tickSession();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("scroll", handleInteraction, { capture: true } as EventListenerOptions);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("resize", handleInteraction);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [throttledActivity, setTabVisible, recordActivity, fetchStats]);

  return <>{children}</>;
}
