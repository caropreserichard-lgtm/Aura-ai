"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { Play, Pause, X, Timer, GripHorizontal } from "lucide-react";
import { useTimerStore } from "@/lib/timerStore";

// Generate alarm sound using Web Audio API
function playAlarm() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Zen bell tone
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.5);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 2);

    // Second bell
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(660, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 2);
      gain2.gain.setValueAtTime(0.25, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.5);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 2.5);
    }, 800);
  } catch {
    // Audio not available
  }
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TimerWidget() {
  const {
    taskTitle,
    totalSeconds,
    remainingSeconds,
    isRunning,
    isFinished,
    isWidgetVisible,
    pauseTimer,
    resumeTimer,
    stopTimer,
    tick,
  } = useTimerStore();

  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const dragControls = useDragControls();
  const hasPlayedAlarm = useRef(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const [blinkOn, setBlinkOn] = useState(true);

  // Tick interval
  useEffect(() => {
    if (isRunning) {
      tickRef.current = setInterval(() => tick(), 1000);
    } else if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isRunning, tick]);

  // Play alarm when finished
  useEffect(() => {
    if (isFinished && !hasPlayedAlarm.current) {
      hasPlayedAlarm.current = true;
      playAlarm();
    }
    if (!isFinished) {
      hasPlayedAlarm.current = false;
    }
  }, [isFinished]);

  // Blink effect when finished
  useEffect(() => {
    if (!isFinished) return;
    const iv = setInterval(() => setBlinkOn((b) => !b), 500);
    return () => clearInterval(iv);
  }, [isFinished]);

  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;

  const handleToggle = useCallback(() => {
    if (isRunning) pauseTimer();
    else resumeTimer();
  }, [isRunning, pauseTimer, resumeTimer]);

  if (!isWidgetVisible) return null;

  return (
    <>
      {/* Full-screen drag constraints */}
      <div
        ref={constraintsRef}
        className="fixed inset-0 pointer-events-none z-[9998]"
      />

      <motion.div
        drag
        dragControls={dragControls}
        dragMomentum={false}
        dragConstraints={constraintsRef}
        initial={{ scale: 0.5, opacity: 0, x: 0, y: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        className="fixed bottom-8 right-8 z-[9999] touch-none"
        style={{ cursor: "grab" }}
        whileDrag={{ cursor: "grabbing", scale: 1.05 }}
      >
        <div
          className={`relative rounded-2xl border shadow-2xl overflow-hidden transition-all duration-300 ${
            isFinished
              ? blinkOn
                ? "border-red-500/60 shadow-red-500/30"
                : "border-red-500/20 shadow-red-500/10"
              : "border-white/10 shadow-black/40"
          }`}
          style={{
            background: isFinished
              ? `rgba(239, 68, 68, ${blinkOn ? 0.15 : 0.08})`
              : "rgba(30, 30, 30, 0.75)",
            backdropFilter: "blur(16px) saturate(1.5)",
            WebkitBackdropFilter: "blur(16px) saturate(1.5)",
            minWidth: 220,
          }}
        >
          {/* Progress bar at top */}
          <div className="h-1 bg-white/5">
            <div
              className="h-full transition-all duration-1000 ease-linear rounded-full"
              style={{
                width: `${progress}%`,
                backgroundColor: isFinished ? "#ef4444" : "#22c55e",
              }}
            />
          </div>

          <div className="px-4 py-3 flex items-center gap-3">
            {/* Drag handle */}
            <div
              className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/40 transition-colors"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <GripHorizontal size={14} />
            </div>

            {/* Timer icon */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isFinished
                  ? "bg-red-500/20"
                  : isRunning
                  ? "bg-emerald-500/20"
                  : "bg-white/10"
              }`}
            >
              <Timer
                size={16}
                className={
                  isFinished
                    ? "text-red-400"
                    : isRunning
                    ? "text-emerald-400"
                    : "text-white/60"
                }
              />
            </div>

            {/* Time + title */}
            <div className="flex-1 min-w-0">
              <p
                className={`font-mono text-lg font-bold leading-none ${
                  isFinished
                    ? "text-red-400"
                    : isRunning
                    ? "text-emerald-400"
                    : "text-white/80"
                }`}
              >
                {isFinished ? "00:00" : formatCountdown(remainingSeconds)}
              </p>
              <p className="text-[10px] text-white/40 truncate mt-0.5 max-w-[140px]">
                {taskTitle || "Timer"}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5">
              {!isFinished && (
                <button
                  onClick={handleToggle}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isRunning
                      ? "bg-white/10 hover:bg-white/20 text-white/80"
                      : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
                  }`}
                >
                  {isRunning ? <Pause size={14} /> : <Play size={14} />}
                </button>
              )}
              <button
                onClick={stopTimer}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 text-white/40 hover:text-white/70 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Finished message */}
          {isFinished && (
            <div className="px-4 pb-3 pt-0">
              <p className="text-[11px] text-red-400 font-semibold animate-pulse">
                Time&apos;s up!
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
