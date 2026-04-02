"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { Play, Pause, X, Timer, GripHorizontal, Plus, Minus } from "lucide-react";
import { useTimerStore } from "@/lib/timerStore";
import { getSoundById } from "@/lib/timerSounds";

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const SIZE_CONFIG = {
  compact: { minW: 180, px: "px-3", py: "py-2", iconSize: 12, timeText: "text-base", titleText: "text-[8px]", btnSize: "w-6 h-6", gap: "gap-2" },
  normal: { minW: 220, px: "px-4", py: "py-3", iconSize: 16, timeText: "text-lg", titleText: "text-[10px]", btnSize: "w-8 h-8", gap: "gap-3" },
  large: { minW: 280, px: "px-5", py: "py-4", iconSize: 20, timeText: "text-2xl", titleText: "text-xs", btnSize: "w-10 h-10", gap: "gap-4" },
};

const SHAPE_CLASS = {
  rounded: "rounded-2xl",
  pill: "rounded-full",
  square: "rounded-lg",
};

export default function TimerWidget() {
  const store = useTimerStore();
  const {
    taskTitle, totalSeconds, remainingSeconds, isRunning, isFinished,
    isWidgetVisible, pauseTimer, resumeTimer, stopTimer, tick, addTime,
    soundId, widgetSize, widgetShape, widgetOpacity,
  } = store;

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickFnRef = useRef(tick);
  tickFnRef.current = tick;
  const dragControls = useDragControls();
  const hasPlayedAlarm = useRef(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const [blinkOn, setBlinkOn] = useState(true);

  const cfg = SIZE_CONFIG[widgetSize];
  const shapeClass = SHAPE_CLASS[widgetShape];

  // Tick interval — timestamp-based, so even if browser throttles to 1/min it catches up
  useEffect(() => {
    if (isRunning) {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = setInterval(() => tickFnRef.current(), 1000);
    } else if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    };
  }, [isRunning]);

  // When tab becomes visible again, immediately recalculate from timestamps
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        tickFnRef.current();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Play selected alarm when finished
  useEffect(() => {
    if (isFinished && !hasPlayedAlarm.current) {
      hasPlayedAlarm.current = true;
      try { getSoundById(soundId).play(); } catch { /* ignore */ }
    }
    if (!isFinished) hasPlayedAlarm.current = false;
  }, [isFinished, soundId]);

  // Blink effect
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
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[9998]" />

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
          className={`relative ${shapeClass} border shadow-2xl overflow-hidden transition-all duration-300 ${
            isFinished
              ? blinkOn ? "border-red-500/60 shadow-red-500/30" : "border-red-500/20 shadow-red-500/10"
              : "border-white/10 shadow-black/40"
          }`}
          style={{
            background: isFinished
              ? `rgba(239, 68, 68, ${blinkOn ? 0.15 : 0.08})`
              : `rgba(30, 30, 30, ${widgetOpacity})`,
            backdropFilter: "blur(16px) saturate(1.5)",
            WebkitBackdropFilter: "blur(16px) saturate(1.5)",
            minWidth: cfg.minW,
          }}
        >
          {/* Progress bar */}
          <div className="h-1 bg-white/5">
            <div className="h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${progress}%`, backgroundColor: isFinished ? "#ef4444" : "#e7ca79" }} />
          </div>

          <div className={`${cfg.px} ${cfg.py} flex items-center ${cfg.gap}`}>
            {/* Drag handle */}
            <div className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/40 transition-colors"
              onPointerDown={(e) => dragControls.start(e)}>
              <GripHorizontal size={cfg.iconSize - 2} />
            </div>

            {/* Timer icon */}
            <div className={`${cfg.btnSize} rounded-full flex items-center justify-center flex-shrink-0 ${
              isFinished ? "bg-red-500/20" : isRunning ? "bg-emerald-500/20" : "bg-white/10"
            }`}>
              <Timer size={cfg.iconSize} className={isFinished ? "text-red-400" : isRunning ? "text-emerald-400" : "text-white/60"} />
            </div>

            {/* Time + title */}
            <div className="flex-1 min-w-0">
              <p className={`font-mono ${cfg.timeText} font-bold leading-none ${
                isFinished ? "text-red-400" : isRunning ? "text-emerald-400" : "text-white/80"
              }`}>
                {isFinished ? "00:00" : formatCountdown(remainingSeconds)}
              </p>
              <p className={`${cfg.titleText} text-white/40 truncate mt-0.5`}>
                {taskTitle || "Timer"}
              </p>
            </div>

            {/* +/- time controls (when paused, not finished) */}
            {!isRunning && !isFinished && totalSeconds > 0 && (
              <div className="flex flex-col gap-0.5">
                <button onClick={() => addTime(1)} className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-white/15 text-white/40 hover:text-white/70 transition-all">
                  <Plus size={10} />
                </button>
                <button onClick={() => { if (remainingSeconds > 60) addTime(-1); }}
                  className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-white/15 text-white/40 hover:text-white/70 transition-all">
                  <Minus size={10} />
                </button>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-1.5">
              {!isFinished && (
                <button onClick={handleToggle}
                  className={`${cfg.btnSize} rounded-full flex items-center justify-center transition-all ${
                    isRunning ? "bg-white/10 hover:bg-white/20 text-white/80" : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
                  }`}>
                  {isRunning ? <Pause size={cfg.iconSize - 2} /> : <Play size={cfg.iconSize - 2} />}
                </button>
              )}
              <button onClick={stopTimer}
                className={`${cfg.btnSize} rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 text-white/40 hover:text-white/70 transition-all`}>
                <X size={cfg.iconSize - 2} />
              </button>
            </div>
          </div>

          {isFinished && (
            <div className={`${cfg.px} pb-3 pt-0`}>
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
