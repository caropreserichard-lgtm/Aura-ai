"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

interface LevelUpModalProps {
  level: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function LevelUpModal({
  level,
  isOpen,
  onClose,
}: LevelUpModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Fire confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981"],
      });

      // Auto close after 3 seconds
      const timeout = setTimeout(onClose, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative text-center animate-bounce">
        <div className="text-6xl mb-2">{"\uD83C\uDF89"}</div>
        <h2 className="font-heading font-extrabold text-4xl text-transparent bg-clip-text xp-gradient">
          Nivel {level}!
        </h2>
        <p className="text-text-secondary mt-2 text-sm">Sigue así, crack</p>
      </div>
    </div>
  );
}
