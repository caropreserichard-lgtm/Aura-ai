"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ban, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const GOLD = "#e7ca79";

type Item = { id: string; text: string; why?: string; mastered?: boolean };

export default function NotToDoReminder() {
  const [enabled, setEnabled] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(`not-to-do-banner-dismissed-${todayKey}`)) {
      setDismissed(true);
      return;
    }
    const sync = () => {
      const on = localStorage.getItem("not-to-do-mode-enabled") === "true";
      setEnabled(on);
      if (!on) return;
      try {
        const raw = localStorage.getItem("not-to-do-list");
        const items: Item[] = raw ? JSON.parse(raw) : [];
        const active = items.filter((i) => !i.mastered);
        if (active.length > 0) {
          setItem(active[Math.floor(Math.random() * active.length)]);
        } else {
          setItem(null);
        }
      } catch {
        setItem(null);
      }
    };
    sync();
    window.addEventListener("not-to-do-mode-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("not-to-do-mode-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const dismiss = () => {
    const todayKey = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`not-to-do-banner-dismissed-${todayKey}`, "1");
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {enabled && item && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          className="mx-4 md:mx-6 mt-4 rounded-xl border flex items-center gap-3 px-4 py-2.5"
          style={{
            background: `linear-gradient(135deg, rgba(231,202,121,0.06), rgba(231,202,121,0.02))`,
            borderColor: `${GOLD}30`,
            backdropFilter: "blur(10px)",
          }}
        >
          <Ban size={15} style={{ color: GOLD }} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-text-muted">
              Today, do not...
            </p>
            <p className="text-sm font-medium truncate" style={{ color: GOLD }}>
              {item.text}
            </p>
          </div>
          <Link
            href="/not-to-do"
            className="text-[11px] px-2 py-1 rounded-lg font-medium hover:opacity-80 transition-opacity flex-shrink-0"
            style={{ background: `${GOLD}18`, color: GOLD }}
          >
            View →
          </Link>
          <button
            onClick={dismiss}
            className="p-1 rounded text-text-muted hover:text-text-secondary transition-colors flex-shrink-0"
          >
            <X size={13} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
