"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

interface LevelUpModalProps { level: number; isOpen: boolean; onClose: () => void; }

export default function LevelUpModal({ level, isOpen, onClose }: LevelUpModalProps) {
  useEffect(() => {
    if (isOpen) confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, colors: ["#4a9e7e", "#6b8aaf", "#e7ca79"] });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-secondary rounded-xl border border-border p-8 text-center max-w-sm shadow-lg">
        <p className="text-4xl mb-3">&#x1F680;</p>
        <h2 className="font-heading font-bold text-xl text-text-primary mb-1">Level Up!</h2>
        <p className="text-text-secondary text-sm mb-1">You reached</p>
        <p className="font-mono font-bold text-3xl text-accent mb-4">Level {level}</p>
        <button onClick={onClose} className="px-6 py-2 rounded-lg bg-accent hover:bg-accent-hover text-text-inverse font-medium text-sm transition-colors">
          Continue
        </button>
      </div>
    </div>
  );
}
