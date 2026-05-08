"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ban, X, Sparkles } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

const GOLD = "#e7ca79";
const STORAGE_KEY = "not-to-do-list";

export type EnergyTag = "Distracción" | "Gasto innecesario" | "Fuga de energía";

export type NotToDoItem = {
  id: string;
  text: string;
  why?: string;
  tag?: EnergyTag;
  createdAt: number;
  mastered?: boolean;
};

const TAGS: { value: EnergyTag; label: string }[] = [
  { value: "Distracción", label: "Distracción" },
  { value: "Gasto innecesario", label: "Gasto innecesario" },
  { value: "Fuga de energía", label: "Fuga de energía" },
];

function loadItems(): NotToDoItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NotToDoItem[]) : [];
  } catch {
    return [];
  }
}

function saveItems(items: NotToDoItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function NotToDoPage() {
  const [items, setItems] = useState<NotToDoItem[]>([]);
  const [text, setText] = useState("");
  const [why, setWhy] = useState("");
  const [tag, setTag] = useState<EnergyTag | "">("");
  const [showWhy, setShowWhy] = useState(false);
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(loadItems());
  }, []);

  // Weekly reflection prompt — once per ISO week
  useEffect(() => {
    const now = new Date();
    const onejan = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((+now - +onejan) / 86400000 + onejan.getDay() + 1) / 7);
    const key = `not-to-do-reflection-${now.getFullYear()}-${week}`;
    if (now.getDay() === 0 && !localStorage.getItem(key)) {
      setReflectionOpen(true);
    }
  }, []);

  const persist = (next: NotToDoItem[]) => {
    setItems(next);
    saveItems(next);
  };

  const addItem = () => {
    const t = text.trim();
    if (!t) return;
    const item: NotToDoItem = {
      id: crypto.randomUUID(),
      text: t,
      why: why.trim() || undefined,
      tag: tag || undefined,
      createdAt: Date.now(),
    };
    persist([item, ...items]);
    setText("");
    setWhy("");
    setTag("");
    setShowWhy(false);
    inputRef.current?.focus();
  };

  const removeItem = (id: string) => {
    persist(items.filter((i) => i.id !== id));
  };

  const markMastered = (id: string, mastered: boolean) => {
    persist(items.map((i) => (i.id === id ? { ...i, mastered } : i)));
  };

  const closeReflection = (anyMastered: boolean) => {
    const now = new Date();
    const onejan = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((+now - +onejan) / 86400000 + onejan.getDay() + 1) / 7);
    localStorage.setItem(`not-to-do-reflection-${now.getFullYear()}-${week}`, "1");
    if (anyMastered) {
      persist(items.map((i) => ({ ...i, mastered: true })));
    }
    setReflectionOpen(false);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar />
        <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
              The Forbidden Path
            </h1>
            <p className="text-sm text-text-muted mt-1.5">
              Not-To-Do List · Sophisticated discipline
            </p>
          </div>

          {/* Glass container */}
          <div
            className="rounded-2xl p-5 md:p-7 border"
            style={{
              background: "linear-gradient(135deg, rgba(231,202,121,0.04), rgba(255,255,255,0.02))",
              borderColor: `${GOLD}25`,
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          >
            {/* Input row */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <Ban size={16} style={{ color: GOLD, opacity: 0.7 }} />
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addItem();
                  }}
                  placeholder="Add a prohibition..."
                  className="flex-1 bg-transparent border-0 border-b border-border focus:border-[#e7ca79]/60 outline-none py-2 text-[15px] text-text-primary placeholder:text-text-muted transition-colors"
                />
                <button
                  onClick={() => setShowWhy((v) => !v)}
                  className="text-[11px] text-text-muted hover:text-[#e7ca79] transition-colors px-2 py-1 rounded"
                >
                  {showWhy ? "Hide why" : "Add why"}
                </button>
              </div>

              <AnimatePresence>
                {showWhy && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    className="overflow-hidden space-y-2 pl-7"
                  >
                    <input
                      value={why}
                      onChange={(e) => setWhy(e.target.value)}
                      placeholder="Why? It kills my morning deep work..."
                      className="w-full bg-transparent border-0 border-b border-border/60 focus:border-[#e7ca79]/40 outline-none py-1.5 text-xs italic text-text-secondary placeholder:text-text-muted/70"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider text-text-muted">
                        Energy leak:
                      </span>
                      {TAGS.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setTag(tag === t.value ? "" : t.value)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border ${
                            tag === t.value
                              ? "border-[#e7ca79] text-[#e7ca79] bg-[#e7ca79]/10"
                              : "border-border text-text-muted hover:border-[#e7ca79]/40 hover:text-text-secondary"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* List */}
            <div className="mt-6 space-y-1.5">
              <AnimatePresence initial={false}>
                {items.length === 0 ? (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-text-muted/80 italic py-6 text-center"
                  >
                    Nothing forbidden yet. Discipline begins with a single line.
                  </motion.p>
                ) : (
                  items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 12, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 320, damping: 28 }}
                      className="group relative flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors"
                    >
                      <button
                        onClick={() => markMastered(item.id, !item.mastered)}
                        title={item.mastered ? "Mastered" : "Mark as forbidden"}
                        className="mt-0.5 flex-shrink-0 transition-all"
                        style={{
                          color: item.mastered ? GOLD : "rgba(231,202,121,0.55)",
                          filter: item.mastered ? `drop-shadow(0 0 6px ${GOLD}80)` : undefined,
                        }}
                      >
                        <ForbiddenIcon mastered={!!item.mastered} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-[14px] leading-snug ${
                            item.mastered ? "text-[#e7ca79]" : "text-text-primary"
                          }`}
                          style={
                            item.mastered
                              ? { textShadow: `0 0 12px ${GOLD}40` }
                              : undefined
                          }
                        >
                          {item.text}
                        </p>
                        {item.why && (
                          <p className="text-[11px] italic text-text-muted mt-0.5">
                            {item.why}
                          </p>
                        )}
                        {item.tag && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border border-[#e7ca79]/25 text-[#e7ca79]/80">
                            {item.tag}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-red-400 p-1 rounded"
                        title="Habit mastered — remove"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          <p className="text-[11px] text-text-muted/60 mt-4 text-center">
            What you do not do shapes you as much as what you do.
          </p>
        </div>
      </main>

      {/* Weekly reflection */}
      <AnimatePresence>
        {reflectionOpen && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="rounded-2xl p-6 max-w-md w-full border"
              style={{
                background: "linear-gradient(135deg, rgba(231,202,121,0.08), rgba(0,0,0,0.4))",
                borderColor: `${GOLD}40`,
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} style={{ color: GOLD }} />
                <h3 className="font-heading text-lg text-text-primary">Weekly reflection</h3>
              </div>
              <p className="text-sm text-text-secondary mb-5">
                ¿Lograste evitar estas conductas esta semana?
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => closeReflection(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-secondary border border-border hover:bg-bg-hover transition-colors"
                >
                  Aún no
                </button>
                <button
                  onClick={() => closeReflection(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-bg-primary"
                  style={{ background: `linear-gradient(135deg, ${GOLD}, #c4a94f)` }}
                >
                  Sí, lo logré
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ForbiddenIcon({ mastered }: { mastered: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className="transition-all hover:scale-110"
      style={{
        filter: mastered ? `drop-shadow(0 0 4px ${GOLD})` : undefined,
      }}
    >
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" />
      <line x1="4" y1="14" x2="14" y2="4" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
