"use client";

import { useEffect, useCallback } from "react";
import { usePulseStore } from "@/lib/pulseStore";

export default function PulseProvider({ children }: { children: React.ReactNode }) {
  const { sessionStartTime, startSession, tickSession, setTodayStats, setStreak } = usePulseStore();

  // Start session on mount
  useEffect(() => {
    if (!sessionStartTime) startSession();
  }, [sessionStartTime, startSession]);

  // Tick every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => tickSession(), 30000);
    // Tick immediately
    tickSession();
    return () => clearInterval(interval);
  }, [tickSession]);

  // Fetch today's stats and streak
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
    // Refresh stats every 2 minutes
    const iv = setInterval(fetchStats, 120000);
    return () => clearInterval(iv);
  }, [fetchStats]);

  // Track user activity (mouse/keyboard = reset inactivity)
  useEffect(() => {
    const handleActivity = () => {
      usePulseStore.setState({ lastActivityTime: Date.now(), inactiveMinutes: 0 });
    };
    window.addEventListener("click", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    return () => {
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, []);

  return <>{children}</>;
}
