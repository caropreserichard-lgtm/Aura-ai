"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  Search, Plus, Sparkles, Trash2, ExternalLink, ChevronRight,
  CheckSquare, Square, X, Lightbulb, Loader2, Check, Edit3,
  Globe, AlertCircle, Pin, GripVertical, FolderCog, Wand2,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { detectPlatform, normalizeUrlForDedupe, PLATFORM_THEME, VaultPlatform } from "@/lib/vault-helpers";

// ─── Types ────────────────────────────────────────────────────────────────────

type VaultStatus = "unread" | "in_progress" | "completed";

interface VaultItem {
  _id: string;
  url: string;
  title: string;
  category: string;
  status: VaultStatus;
  summary?: string;
  insight?: string; // legacy
  idea: string;
  platform?: VaultPlatform;
  pinned?: boolean;
  order?: number;
  created_at: string;
}

const STATUS_THEME: Record<VaultStatus, { label: string; dot: string; ring: string }> = {
  unread:      { label: "No leído",   dot: "#9ca3af", ring: "rgba(156,163,175,0.35)" },
  in_progress: { label: "En proceso", dot: "#60a5fa", ring: "rgba(96,165,250,0.35)" },
  completed:   { label: "Completado", dot: "#e7ca79", ring: "rgba(231,202,121,0.4)" },
};

const STATUS_CYCLE: Record<VaultStatus, VaultStatus> = {
  unread: "in_progress",
  in_progress: "completed",
  completed: "unread",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDomain(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}

function getSummary(item: VaultItem): string {
  return item.summary || item.insight || "";
}

/** Hash a string into a hue (0-360) so each category gets a stable color. */
function hueFromString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

function categoryTheme(name: string) {
  const hue = hueFromString(name);
  return {
    color: `hsl(${hue}, 65%, 65%)`,
    bg: `hsla(${hue}, 65%, 60%, 0.10)`,
    border: `hsla(${hue}, 65%, 60%, 0.28)`,
  };
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState { id: number; type: "success" | "error" | "info"; message: string; }

function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const push = useCallback((type: ToastState["type"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return { toasts, push };
}

function Toaster({ toasts }: { toasts: ToastState[] }) {
  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 pointer-events-auto"
            style={{
              background: t.type === "error"
                ? "rgba(239,68,68,0.14)"
                : t.type === "success"
                ? "rgba(231,202,121,0.14)"
                : "rgba(255,255,255,0.08)",
              border: `1px solid ${t.type === "error" ? "rgba(239,68,68,0.35)" : t.type === "success" ? "rgba(231,202,121,0.35)" : "rgba(255,255,255,0.18)"}`,
              backdropFilter: "blur(20px)",
              color: t.type === "error" ? "#fca5a5" : t.type === "success" ? "#e7ca79" : "#e5e5e5",
              boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
            }}
          >
            {t.type === "error" && <AlertCircle size={14} />}
            {t.type === "success" && <Check size={14} />}
            <span className="font-medium">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Add Link Modal (manual / OG) ────────────────────────────────────────────

function AddLinkModal({
  open, onClose, onCreated, existingCategories,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (item: VaultItem) => void;
  existingCategories: string[];
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [summary, setSummary] = useState("");
  const [platform, setPlatform] = useState<VaultPlatform>("Web");
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scraped, setScraped] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = useCallback(() => {
    setUrl(""); setTitle(""); setCategory(""); setSummary("");
    setPlatform("Web"); setScraped(false); setErr(null);
  }, []);

  useEffect(() => { if (!open) reset(); }, [open, reset]);

  const handleScrape = async () => {
    const u = url.trim();
    if (!/^https?:\/\//.test(u)) { setErr("URL debe empezar con http:// o https://"); return; }
    setErr(null); setScraping(true);
    try {
      const res = await fetch("/api/vault/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u, mode: "og" }),
      });
      if (!res.ok) throw new Error("scrape failed");
      const data = await res.json();
      setTitle(data.title || u);
      setPlatform(data.platform || detectPlatform(u));
      setScraped(true);
    } catch {
      setTitle(u);
      setPlatform(detectPlatform(u));
      setScraped(true);
      setErr("No se pudo leer el preview, pero puedes guardar igual.");
    } finally {
      setScraping(false);
    }
  };

  const handleSave = async () => {
    if (!url.trim() || !title.trim()) { setErr("URL y título son requeridos"); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim(),
          category: (category.trim() || "Sin Clasificar"),
          summary: summary.trim(),
          platform,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "duplicate") { setErr("Este link ya está en tu bóveda"); setSaving(false); return; }
        throw new Error(data.error || "save failed");
      }
      onCreated(data);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-md rounded-2xl border overflow-hidden"
          style={{
            background: "rgba(24,24,24,0.92)",
            backdropFilter: "blur(20px)",
            borderColor: "rgba(231,202,121,0.18)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Agregar link</h3>
              <p className="text-[11px] text-text-muted mt-0.5">OG scraping — sin créditos de IA</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted">
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium">URL</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 text-sm rounded-lg px-3 py-2 outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e8e8e8" }}
                  onKeyDown={(e) => e.key === "Enter" && !scraped && handleScrape()}
                />
                {!scraped && (
                  <button
                    onClick={handleScrape}
                    disabled={scraping || !url.trim()}
                    className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                    style={{ background: "rgba(231,202,121,0.15)", color: "#e7ca79", border: "1px solid rgba(231,202,121,0.25)" }}
                  >
                    {scraping ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
                    Preview
                  </button>
                )}
              </div>
            </div>

            {scraped && (
              <>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Título</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-sm rounded-lg px-3 py-2 outline-none mt-1"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e8e8e8" }}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Categoría</label>
                  <input
                    list="vault-categories"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ej: Crypto Strategy, GTA, SaaS..."
                    className="w-full text-sm rounded-lg px-3 py-2 outline-none mt-1"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e8e8e8" }}
                  />
                  <datalist id="vault-categories">
                    {existingCategories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Resumen (opcional)</label>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Una frase explicando por qué guardas este link..."
                    rows={2}
                    className="w-full text-sm rounded-lg px-3 py-2 outline-none mt-1 resize-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e8e8e8" }}
                  />
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-text-muted">Plataforma detectada:</span>
                  <span
                    className="px-2 py-0.5 rounded-full font-medium border"
                    style={{
                      background: PLATFORM_THEME[platform].bg,
                      color: PLATFORM_THEME[platform].color,
                      borderColor: PLATFORM_THEME[platform].border,
                    }}
                  >
                    {platform}
                  </span>
                </div>
              </>
            )}

            {err && (
              <div className="text-[11px] flex items-center gap-1.5 p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", color: "#fca5a5" }}>
                <AlertCircle size={11} /> {err}
              </div>
            )}
          </div>

          <div className="px-5 pb-4 flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-lg text-xs text-text-muted hover:bg-white/5">Cancelar</button>
            {scraped && (
              <button
                onClick={handleSave}
                disabled={saving || !url.trim() || !title.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #e7ca79, #c4a94f)", color: "#1a1a1a" }}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Guardar
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Bulk Add Modal (AI Pro + Manual OG) ─────────────────────────────────────

function BulkAddModal({
  open, onClose, onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  onCompleted: (created: VaultItem[], skipped: number, aiError?: string) => void;
}) {
  const [mode, setMode] = useState<"ai" | "og">("ai");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (!open) { setText(""); setErr(null); } }, [open]);

  const urlCount = useMemo(() => (text.match(/https?:\/\/[^\s<>"')]+/gi) || []).length, [text]);

  const handleSubmit = async () => {
    if (urlCount === 0) { setErr("Pega al menos una URL"); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/vault/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "bulk failed");
      onCompleted(data.created || [], (data.skipped || []).length, data.aiError);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error en el lote");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const isAI = mode === "ai";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-lg rounded-2xl border overflow-hidden"
          style={{
            background: "rgba(24,24,24,0.92)",
            backdropFilter: "blur(20px)",
            borderColor: isAI ? "rgba(168,85,247,0.25)" : "rgba(231,202,121,0.22)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={isAI
                  ? { background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }
                  : { background: "rgba(231,202,121,0.12)", border: "1px solid rgba(231,202,121,0.28)" }
                }
              >
                {isAI ? <Sparkles size={15} color="#c084fc" /> : <Globe size={15} color="#e7ca79" />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Importar links en lote</h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {isAI ? "Clasificación automática con IA" : "Solo OG scraping — sin créditos"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted">
              <X size={16} />
            </button>
          </div>

          {/* Mode tabs */}
          <div className="px-5 pt-4 flex gap-2">
            {([["ai", "Con IA", "Categoriza y genera resúmenes automáticos"], ["og", "Manual (sin IA)", "Scraping OG — tú asignas la categoría"]] as const).map(([m, label, desc]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left"
                style={{
                  background: mode === m
                    ? m === "ai" ? "rgba(168,85,247,0.15)" : "rgba(231,202,121,0.12)"
                    : "rgba(255,255,255,0.03)",
                  borderColor: mode === m
                    ? m === "ai" ? "rgba(168,85,247,0.4)" : "rgba(231,202,121,0.35)"
                    : "rgba(255,255,255,0.06)",
                  color: mode === m
                    ? m === "ai" ? "#c084fc" : "#e7ca79"
                    : "#6b7280",
                }}
              >
                <span>{label}</span>
                <p className="text-[10px] font-normal opacity-75 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>

          <div className="p-5 space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Pega aquí varias URLs (una por línea o mezcladas en texto):\n\nhttps://...\nhttps://..."}
              rows={7}
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none resize-none font-mono"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e8e8e8" }}
            />
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-muted">
                {urlCount === 0 ? "Aún no detecto URLs" : `${urlCount} URL${urlCount === 1 ? "" : "s"} detectada${urlCount === 1 ? "" : "s"}`}
              </span>
              <span className="text-text-muted opacity-60">
                {isAI ? "Máx 60 · 1 crédito IA total" : "Máx 60 · sin créditos IA"}
              </span>
            </div>

            {err && (
              <div className="text-[11px] flex items-center gap-1.5 p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", color: "#fca5a5" }}>
                <AlertCircle size={11} /> {err}
              </div>
            )}
          </div>

          <div className="px-5 pb-5 flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-lg text-xs text-text-muted hover:bg-white/5">Cancelar</button>
            <button
              onClick={handleSubmit}
              disabled={busy || urlCount === 0}
              className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              style={isAI
                ? { background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff" }
                : { background: "linear-gradient(135deg, #e7ca79, #c4a94f)", color: "#1a1a1a" }
              }
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : isAI ? <Sparkles size={12} /> : <Globe size={12} />}
              {busy ? "Procesando..." : `Importar ${urlCount} link${urlCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item, selected, onToggleSelect, onCycleStatus, onDelete, onEditCategory, onTogglePin, query,
  dragHandleProps, isDragging,
}: {
  item: VaultItem;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onCycleStatus: (item: VaultItem) => void;
  onDelete: (id: string) => void;
  onEditCategory: (item: VaultItem) => void;
  onTogglePin: (item: VaultItem) => void;
  query: string;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
}) {
  const [editIdea, setEditIdea] = useState(false);
  const [ideaText, setIdeaText] = useState(item.idea || "");
  const [editTitle, setEditTitle] = useState(false);
  const [titleText, setTitleText] = useState(item.title || "");
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const status = STATUS_THEME[item.status];
  const platform = item.platform || detectPlatform(item.url);
  const platformTheme = PLATFORM_THEME[platform];
  const isPinned = !!item.pinned;

  useEffect(() => { if (editIdea) ideaRef.current?.focus(); }, [editIdea]);
  useEffect(() => { if (editTitle) titleInputRef.current?.focus(); }, [editTitle]);

  const saveTitle = async () => {
    const newTitle = titleText.trim();
    if (!newTitle || newTitle === item.title) { setEditTitle(false); setTitleText(item.title || ""); return; }
    await fetch(`/api/vault/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    item.title = newTitle;
    setEditTitle(false);
  };

  const saveIdea = async () => {
    if (ideaText === (item.idea || "")) { setEditIdea(false); return; }
    await fetch(`/api/vault/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: ideaText }),
    });
    item.idea = ideaText;
    setEditIdea(false);
  };

  // Highlight search matches
  const renderTitle = () => {
    if (!query) return item.title;
    const idx = item.title.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return item.title;
    return (
      <>
        {item.title.slice(0, idx)}
        <mark style={{ background: "rgba(231,202,121,0.25)", color: "#e7ca79", padding: 0 }}>
          {item.title.slice(idx, idx + query.length)}
        </mark>
        {item.title.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div
      className="group relative px-3 py-2.5 rounded-xl border transition-colors"
      style={{
        background: isDragging
          ? "rgba(231,202,121,0.12)"
          : isPinned
            ? "rgba(231,202,121,0.05)"
            : selected
              ? "rgba(231,202,121,0.08)"
              : "rgba(255,255,255,0.025)",
        borderColor: isDragging
          ? "rgba(231,202,121,0.45)"
          : isPinned
            ? "rgba(231,202,121,0.20)"
            : selected
              ? "rgba(231,202,121,0.30)"
              : "rgba(255,255,255,0.06)",
        opacity: item.status === "completed" ? 0.65 : 1,
        boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.35)" : undefined,
      }}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...dragHandleProps}
          className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing opacity-30 hover:opacity-90 transition-opacity"
          style={{ color: "#888", touchAction: "none" }}
          title="Arrastra para reordenar"
          onClick={(e) => e.preventDefault()}
        >
          <GripVertical size={14} />
        </button>

        {/* Selection checkbox */}
        <button
          onClick={() => onToggleSelect(item._id)}
          className="mt-0.5 shrink-0 transition-colors"
          style={{ color: selected ? "#e7ca79" : "#525252" }}
          title={selected ? "Deseleccionar" : "Seleccionar"}
        >
          {selected ? <CheckSquare size={15} /> : <Square size={15} />}
        </button>

        {/* Status dot */}
        <button
          onClick={() => onCycleStatus(item)}
          className="mt-1 shrink-0 w-2.5 h-2.5 rounded-full transition-all"
          style={{
            background: status.dot,
            boxShadow: `0 0 0 3px ${status.ring}`,
          }}
          title={status.label}
        />

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Title row — bold header, click pencil to edit */}
          <div className="flex items-start gap-2 flex-wrap">
            {isPinned && (
              <Pin size={11} fill="#e7ca79" color="#e7ca79" className="shrink-0 mt-1" />
            )}
            {editTitle ? (
              <input
                ref={titleInputRef}
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setEditTitle(false); setTitleText(item.title || ""); } }}
                className="flex-1 min-w-0 text-[13px] font-semibold rounded-md px-2 py-0.5 outline-none"
                style={{ background: "rgba(231,202,121,0.08)", border: "1px solid rgba(231,202,121,0.35)", color: "#e8e8e8" }}
              />
            ) : (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold text-text-primary hover:text-[#e7ca79] transition-colors leading-snug"
                style={{
                  textDecoration: item.status === "completed" ? "line-through" : "none",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {renderTitle()}
              </a>
            )}
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-md font-medium border shrink-0"
              style={{ background: platformTheme.bg, color: platformTheme.color, borderColor: platformTheme.border }}
            >
              {platform}
            </span>
          </div>

          {/* Domain */}
          <p className="text-[10px] text-text-muted opacity-60 mt-1">{getDomain(item.url)}</p>

          {/* Idea row */}
          {(item.idea || editIdea) && (
            <div className="mt-2">
              {editIdea ? (
                <div>
                  <textarea
                    ref={ideaRef}
                    value={ideaText}
                    onChange={(e) => setIdeaText(e.target.value)}
                    rows={2}
                    placeholder="Idea de negocio rápida..."
                    className="w-full text-[11px] rounded-md px-2 py-1.5 outline-none resize-none"
                    style={{ background: "rgba(231,202,121,0.06)", border: "1px solid rgba(231,202,121,0.2)", color: "#e8e8e8" }}
                  />
                  <div className="flex gap-1 mt-1 justify-end">
                    <button onClick={() => { setIdeaText(item.idea || ""); setEditIdea(false); }} className="text-[10px] text-text-muted">Cancelar</button>
                    <button onClick={saveIdea} className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(231,202,121,0.15)", color: "#e7ca79" }}>Guardar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditIdea(true)} className="text-[11px] italic flex items-start gap-1 hover:opacity-90 text-left" style={{ color: "#e7ca79" }}>
                  <Lightbulb size={11} className="mt-0.5 shrink-0" />
                  <span>{item.idea}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right column: actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Pin button — always visible if pinned */}
          <button
            onClick={() => onTogglePin(item)}
            className={`p-1.5 rounded-md hover:bg-white/5 transition-opacity ${isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            style={{ color: isPinned ? "#e7ca79" : "#888" }}
            title={isPinned ? "Desfijar" : "Fijar arriba"}
          >
            <Pin size={13} fill={isPinned ? "#e7ca79" : "none"} />
          </button>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            {!item.idea && !editIdea && (
              <button onClick={() => setEditIdea(true)} className="p-1.5 rounded-md hover:bg-white/5" style={{ color: "#888" }} title="Agregar idea">
                <Lightbulb size={13} />
              </button>
            )}
            <button onClick={() => { setEditTitle(true); setTitleText(item.title || ""); }} className="p-1.5 rounded-md hover:bg-white/5" style={{ color: "#888" }} title="Editar título">
              <Edit3 size={13} />
            </button>
            <button onClick={() => onEditCategory(item)} className="p-1.5 rounded-md hover:bg-white/5" style={{ color: "#888" }} title="Cambiar categoría">
              <FolderCog size={13} />
            </button>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-white/5" style={{ color: "#888" }}>
              <ExternalLink size={13} />
            </a>
            <button onClick={() => onDelete(item._id)} className="p-1.5 rounded-md hover:bg-white/5" style={{ color: "#d4544e" }}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Category Section (sticky header + accordion) ────────────────────────────

function CategorySection({
  category, items, expanded, onToggle, selected, onToggleSelect,
  onCycleStatus, onDelete, onEditCategory, onTogglePin, query,
}: {
  category: string;
  items: VaultItem[];
  expanded: boolean;
  onToggle: () => void;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onCycleStatus: (item: VaultItem) => void;
  onDelete: (id: string) => void;
  onEditCategory: (item: VaultItem) => void;
  onTogglePin: (item: VaultItem) => void;
  query: string;
}) {
  const theme = categoryTheme(category);
  const completed = items.filter((i) => i.status === "completed").length;
  const total = items.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const droppableId = `cat:${category}`;

  return (
    <section className="relative">
      {/* Sticky header */}
      <button
        onClick={onToggle}
        className="sticky top-0 z-10 w-full text-left flex items-center gap-3 px-3 py-2.5 transition-colors"
        style={{
          background: "rgba(20,20,20,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="shrink-0"
        >
          <ChevronRight size={14} color="#888" />
        </motion.div>

        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: theme.color, boxShadow: `0 0 0 3px ${theme.bg}` }}
        />

        <span className="text-[13px] font-semibold text-text-primary">{category}</span>

        <span className="text-[11px] text-text-muted">({total})</span>

        {/* Progress mini-bar */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-text-muted">{completed}/{total}</span>
          <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: theme.color }} />
          </div>
        </div>
      </button>

      {/* Expanding body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ overflow: "hidden" }}
          >
            <Droppable droppableId={droppableId}>
              {(dropProvided) => (
                <div
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  className="space-y-1.5 px-2 py-2"
                >
                  {items.map((item, index) => (
                    <Draggable key={item._id} draggableId={item._id} index={index}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          style={{
                            ...dragProvided.draggableProps.style,
                          }}
                        >
                          <ItemRow
                            item={item}
                            selected={selected.has(item._id)}
                            onToggleSelect={onToggleSelect}
                            onCycleStatus={onCycleStatus}
                            onDelete={onDelete}
                            onEditCategory={onEditCategory}
                            onTogglePin={onTogglePin}
                            query={query}
                            dragHandleProps={dragProvided.dragHandleProps as React.HTMLAttributes<HTMLButtonElement> | undefined}
                            isDragging={dragSnapshot.isDragging}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── Edit Category Modal ─────────────────────────────────────────────────────

function EditCategoryModal({
  item, existingCategories, onClose, onSaved,
}: {
  item: VaultItem | null;
  existingCategories: string[];
  onClose: () => void;
  onSaved: (id: string, category: string) => void;
}) {
  const [selected, setSelected] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setCustomValue("");
    setSelected(item.category || "Sin Clasificar");
  }, [item]);

  if (!item) return null;

  const isCustom = selected === "__nueva__";
  const finalValue = isCustom ? customValue.trim() : selected;

  const handleSave = async () => {
    const v = finalValue || "Sin Clasificar";
    setSaving(true);
    await fetch(`/api/vault/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: v }),
    });
    onSaved(item._id, v);
    setSaving(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-sm rounded-2xl border overflow-hidden"
          style={{
            background: "rgba(24,24,24,0.92)",
            backdropFilter: "blur(20px)",
            borderColor: "rgba(255,255,255,0.08)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-semibold text-text-primary">Cambiar categoría</h3>
            <p className="text-[11px] text-text-muted mt-0.5 truncate">{item.title}</p>
          </div>
          <div className="p-5 space-y-3">
            <select
              autoFocus
              value={selected}
              onChange={(e) => { setSelected(e.target.value); setCustomValue(""); }}
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none appearance-none cursor-pointer"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(231,202,121,0.35)", color: "#e8e8e8" }}
            >
              {existingCategories.sort().map((c) => (
                <option key={c} value={c} style={{ background: "#1c1c1c", color: "#e8e8e8" }}>{c}</option>
              ))}
              <option value="__nueva__" style={{ background: "#1c1c1c", color: "#e7ca79" }}>＋ Nueva categoría...</option>
            </select>
            {isCustom && (
              <input
                autoFocus
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                placeholder="Nombre de la nueva categoría"
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(231,202,121,0.3)", color: "#e8e8e8" }}
              />
            )}
          </div>
          <div className="px-5 pb-4 flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-lg text-xs text-text-muted hover:bg-white/5">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #e7ca79, #c4a94f)", color: "#1a1a1a" }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Guardar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Manage Categories Modal ─────────────────────────────────────────────────

function ManageCategoriesModal({
  open, onClose, categories, onChanged, onCategoryCreated,
}: {
  open: boolean;
  onClose: () => void;
  categories: { name: string; count: number }[];
  onChanged: () => void;
  onCategoryCreated: (name: string) => void;
}) {
  const [renamingFrom, setRenamingFrom] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newCategoryValue, setNewCategoryValue] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setRenamingFrom(null); setRenameValue(""); setNewCategoryValue(""); setCreateMsg(null); }
  }, [open]);

  const handleCreateCategory = () => {
    const name = newCategoryValue.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setCreateMsg(`"${name}" ya existe.`);
      return;
    }
    onCategoryCreated(name);
    setCreateMsg(`"${name}" creada. Ya puedes asignarla a tus links.`);
    setNewCategoryValue("");
  };

  const handleRename = async (from: string) => {
    const to = renameValue.trim();
    if (!to || to === from) { setRenamingFrom(null); return; }
    setBusy(from);
    try {
      await fetch("/api/vault/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      setRenamingFrom(null);
      onChanged();
    } finally { setBusy(null); }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`¿Mover todos los links de "${name}" a "Sin Clasificar"?`)) return;
    setBusy(name);
    try {
      await fetch("/api/vault/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, reassignTo: "Sin Clasificar" }),
      });
      onChanged();
    } finally { setBusy(null); }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-md rounded-2xl border overflow-hidden"
          style={{
            background: "rgba(24,24,24,0.92)",
            backdropFilter: "blur(20px)",
            borderColor: "rgba(231,202,121,0.20)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <FolderCog size={16} color="#e7ca79" />
              <h3 className="text-sm font-semibold text-text-primary">Gestionar categorías</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted">
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
            {/* Create new category */}
            <div
              className="flex gap-2 items-center p-3 rounded-lg"
              style={{ background: "rgba(231,202,121,0.05)", border: "1px solid rgba(231,202,121,0.15)" }}
            >
              <Plus size={13} color="#e7ca79" className="shrink-0" />
              <input
                value={newCategoryValue}
                onChange={(e) => { setNewCategoryValue(e.target.value); setCreateMsg(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateCategory(); }}
                placeholder="Nombre de nueva categoría..."
                className="flex-1 bg-transparent text-xs outline-none text-text-primary placeholder:text-text-muted"
              />
              <button
                onClick={handleCreateCategory}
                disabled={!newCategoryValue.trim()}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 disabled:opacity-30 transition-all"
                style={{ background: "rgba(231,202,121,0.15)", color: "#e7ca79", border: "1px solid rgba(231,202,121,0.25)" }}
              >
                Crear
              </button>
            </div>
            {createMsg && (
              <p className="text-[11px] text-[#e7ca79] px-1">{createMsg}</p>
            )}

            <div className="space-y-1.5">
              {categories.length === 0 && (
                <p className="text-xs text-text-muted text-center py-4">No hay categorías aún.</p>
              )}
              {categories.map((cat) => {
                const isRenaming = renamingFrom === cat.name;
                const isBusy = busy === cat.name;
                return (
                  <div
                    key={cat.name}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: `hsl(${(() => { let h=0; for(const c of cat.name) h=(h*31+c.charCodeAt(0))%360; return h; })()}, 65%, 65%)` }} />

                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(cat.name);
                          if (e.key === "Escape") { setRenamingFrom(null); setRenameValue(""); }
                        }}
                        onBlur={() => handleRename(cat.name)}
                        list={`existing-cats-${cat.name}`}
                        className="flex-1 bg-transparent text-xs outline-none text-text-primary"
                        placeholder={cat.name}
                      />
                    ) : (
                      <button
                        onClick={() => { setRenamingFrom(cat.name); setRenameValue(cat.name); }}
                        className="flex-1 text-left text-xs font-medium text-text-primary hover:text-[#e7ca79] transition-colors"
                      >
                        {cat.name}
                      </button>
                    )}

                    <datalist id={`existing-cats-${cat.name}`}>
                      {categories.map((c) => c.name !== cat.name && <option key={c.name} value={c.name} />)}
                    </datalist>

                    <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                      {cat.count}
                    </span>

                    {!isRenaming && (
                      <>
                        <button
                          onClick={() => { setRenamingFrom(cat.name); setRenameValue(cat.name); }}
                          disabled={isBusy}
                          className="p-1 rounded hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors disabled:opacity-30"
                          title="Renombrar"
                        >
                          <Edit3 size={11} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.name)}
                          disabled={isBusy}
                          className="p-1 rounded hover:bg-white/5 text-red-400 transition-colors disabled:opacity-30"
                          title="Eliminar (mueve a Sin Clasificar)"
                        >
                          {isBusy ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-5 pb-4 flex justify-end gap-2 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-text-muted hover:bg-white/5">
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VaultPage() {
  const router = useRouter();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showManageCats, setShowManageCats] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [fixingEchoes, setFixingEchoes] = useState(false);
  const [editCatItem, setEditCatItem] = useState<VaultItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hideCompleted, setHideCompleted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<VaultStatus | "all">("all");
  const [manualCategories, setManualCategories] = useState<string[]>([]);
  const { toasts, push: toast } = useToast();

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    try {
      const r = await fetch("/api/vault");
      if (r.status === 401) { router.push("/login"); return; }
      const data = await r.json();
      if (Array.isArray(data)) setItems(data);
    } catch {/* */} finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── Categories (dynamic, derived from data) ──────────────────────────────
  const existingCategories = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => i.category && s.add(i.category));
    manualCategories.forEach((c) => s.add(c));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items, manualCategories]);

  // ── Filter & group ───────────────────────────────────────────────────────
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (hideCompleted && i.status === "completed") return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${i.title} ${i.category} ${getSummary(i)} ${i.url}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, q, hideCompleted, statusFilter]);

  const grouped = useMemo(() => {
    const g = new Map<string, VaultItem[]>();
    filtered.forEach((i) => {
      const c = i.category || "Sin Clasificar";
      if (!g.has(c)) g.set(c, []);
      g.get(c)!.push(i);
    });
    // Sort within each category: pinned desc → order desc → created_at desc
    g.forEach((arr) => {
      arr.sort((a, b) => {
        const ap = a.pinned ? 1 : 0;
        const bp = b.pinned ? 1 : 0;
        if (ap !== bp) return bp - ap;
        const ao = typeof a.order === "number" ? a.order : 0;
        const bo = typeof b.order === "number" ? b.order : 0;
        if (ao !== bo) return bo - ao;
        return (b.created_at || "").localeCompare(a.created_at || "");
      });
    });
    // Categories with at least one pinned item bubble to top
    return Array.from(g.entries()).sort(([catA, a], [catB, b]) => {
      const ap = a.some((i) => i.pinned) ? 1 : 0;
      const bp = b.some((i) => i.pinned) ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return catA.localeCompare(catB);
    });
  }, [filtered]);

  // ── Auto-expand on search ────────────────────────────────────────────────
  useEffect(() => {
    if (q) {
      // Expand all categories that contain matches
      setExpanded(new Set(grouped.map(([c]) => c)));
    }
  }, [q, grouped]);

  // ── Default expansion: all open on first load ────────────────────────────
  const initRef = useRef(false);
  useEffect(() => {
    if (!loading && !initRef.current && existingCategories.length > 0) {
      setExpanded(new Set(existingCategories));
      initRef.current = true;
    }
  }, [loading, existingCategories]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const toggleSection = (cat: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(grouped.map(([c]) => c)));
  const collapseAll = () => setExpanded(new Set());

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const handleCycleStatus = async (item: VaultItem) => {
    const next = STATUS_CYCLE[item.status];
    setItems((prev) => prev.map((i) => i._id === item._id ? { ...i, status: next } : i));
    await fetch(`/api/vault/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  };

  const handleTogglePin = async (item: VaultItem) => {
    const next = !item.pinned;
    setItems((prev) => prev.map((i) => i._id === item._id ? { ...i, pinned: next } : i));
    toast(next ? "success" : "info", next ? "Fijado arriba 📌" : "Desfijado");
    await fetch(`/api/vault/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: next }),
    });
  };

  const handleReclassify = async (force = false) => {
    if (reclassifying) return;
    const candidates = items.filter((i) => force || !getSummary(i) || (i.category || "Sin Clasificar") === "Sin Clasificar" || i.category === "Otro");
    if (candidates.length === 0) {
      toast("info", "Todos los links ya tienen categoría y resumen");
      return;
    }
    if (candidates.length > 60) {
      toast("error", `Demasiados items (${candidates.length}). Máximo 60 por reclasificación.`);
      return;
    }
    if (!confirm(`Reclasificar ${candidates.length} link${candidates.length === 1 ? "" : "s"} con IA? (≈ ${candidates.length} créditos)`)) return;

    setReclassifying(true);
    toast("info", `Reclasificando ${candidates.length} links con IA...`);
    try {
      const ids = candidates.map((i) => i._id);
      const res = await fetch("/api/vault/reclassify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "fail");
      // Refetch full list to pull new categories/summaries
      const r = await fetch("/api/vault");
      const fresh = await r.json();
      if (Array.isArray(fresh)) setItems(fresh);
      toast("success", `${data.updated} link${data.updated === 1 ? "" : "s"} reclasificado${data.updated === 1 ? "" : "s"} ✨`);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Error al reclasificar");
    } finally {
      setReclassifying(false);
    }
  };

  const handleFixEchoes = async () => {
    if (fixingEchoes) return;
    setFixingEchoes(true);
    toast("info", "Reparando resúmenes rotos sin IA...");
    try {
      const res = await fetch("/api/vault/fix-echoes", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "fail");
      if (data.fixed === 0) {
        toast("info", "No hay resúmenes rotos");
      } else {
        const r = await fetch("/api/vault");
        const fresh = await r.json();
        if (Array.isArray(fresh)) setItems(fresh);
        toast("success", `${data.fixed} resumen${data.fixed === 1 ? "" : "es"} reparado${data.fixed === 1 ? "" : "s"} sin IA`);
      }
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Error al reparar");
    } finally {
      setFixingEchoes(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sourceCat = result.source.droppableId.replace(/^cat:/, "");
    const destCat   = result.destination.droppableId.replace(/^cat:/, "");
    const sameCat   = sourceCat === destCat;
    if (sameCat && result.source.index === result.destination.index) return;

    // Identify the dragged item via draggableId
    const draggedId = result.draggableId;
    const draggedItem = items.find((i) => i._id === draggedId);
    if (!draggedItem) return;

    // ── Cross-category drop: change the item's category, reorder dest ────
    if (!sameCat) {
      // Optimistic update: change category locally
      setItems((prev) => prev.map((i) => i._id === draggedId ? { ...i, category: destCat } : i));

      // Persist category change
      try {
        await fetch(`/api/vault/${draggedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: destCat }),
        });
        toast("success", `Movido a "${destCat}"`);
      } catch {
        toast("error", "No se pudo mover el link");
        return;
      }

      // Recompute order numbers in the destination category (with the dragged item now there)
      const destItems = items
        .filter((i) => (i.category || "Sin Clasificar") === destCat || i._id === draggedId)
        .map((i) => i._id === draggedId ? { ...i, category: destCat } : i);

      const sorted = destItems.sort((a, b) => {
        const ap = a.pinned ? 1 : 0; const bp = b.pinned ? 1 : 0;
        if (ap !== bp) return bp - ap;
        const ao = typeof a.order === "number" ? a.order : 0;
        const bo = typeof b.order === "number" ? b.order : 0;
        if (ao !== bo) return bo - ao;
        return (b.created_at || "").localeCompare(a.created_at || "");
      });

      // Remove dragged from current pos, insert at destination index
      const fromIdx = sorted.findIndex((i) => i._id === draggedId);
      if (fromIdx >= 0) sorted.splice(fromIdx, 1);
      sorted.splice(result.destination.index, 0, { ...draggedItem, category: destCat });

      const base = Date.now();
      const updates = sorted.map((it, idx) => ({ id: it._id, order: base - idx }));
      const orderMap = new Map(updates.map((u) => [u.id, u.order]));
      setItems((prev) => prev.map((i) => orderMap.has(i._id) ? { ...i, order: orderMap.get(i._id)! } : i));

      try {
        await fetch("/api/vault/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: updates }),
        });
      } catch {/* non-fatal */}
      return;
    }

    // ── Same-category reorder ────────────────────────────────────────────
    const catItems = filtered.filter((i) => (i.category || "Sin Clasificar") === sourceCat);
    const sorted = [...catItems].sort((a, b) => {
      const ap = a.pinned ? 1 : 0; const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      const ao = typeof a.order === "number" ? a.order : 0;
      const bo = typeof b.order === "number" ? b.order : 0;
      if (ao !== bo) return bo - ao;
      return (b.created_at || "").localeCompare(a.created_at || "");
    });

    const [moved] = sorted.splice(result.source.index, 1);
    sorted.splice(result.destination.index, 0, moved);

    const base = Date.now();
    const updates = sorted.map((it, idx) => ({ id: it._id, order: base - idx }));
    const orderMap = new Map(updates.map((u) => [u.id, u.order]));
    setItems((prev) => prev.map((i) => orderMap.has(i._id) ? { ...i, order: orderMap.get(i._id)! } : i));

    try {
      await fetch("/api/vault/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updates }),
      });
    } catch {
      toast("error", "No se pudo guardar el orden");
    }
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    await fetch(`/api/vault/${id}`, { method: "DELETE" });
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`¿Eliminar ${selected.size} link${selected.size === 1 ? "" : "s"}?`)) return;
    const ids = Array.from(selected);
    setItems((prev) => prev.filter((i) => !selected.has(i._id)));
    clearSelection();
    await Promise.all(ids.map((id) => fetch(`/api/vault/${id}`, { method: "DELETE" })));
    toast("success", `${ids.length} link${ids.length === 1 ? "" : "s"} eliminado${ids.length === 1 ? "" : "s"}`);
  };

  const handleBulkStatus = async (status: VaultStatus) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    setItems((prev) => prev.map((i) => selected.has(i._id) ? { ...i, status } : i));
    clearSelection();
    await Promise.all(ids.map((id) => fetch(`/api/vault/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })));
    toast("success", `${ids.length} actualizado${ids.length === 1 ? "" : "s"}`);
  };

  const handleAdded = (item: VaultItem) => {
    setItems((prev) => [item, ...prev]);
    setExpanded((prev) => new Set(prev).add(item.category || "Otro"));
    toast("success", "Link guardado en La Bóveda");
  };

  const handleBulkCompleted = (created: VaultItem[], skipped: number, aiError?: string) => {
    setItems((prev) => [...created, ...prev]);
    if (created.length > 0) {
      const cats = new Set(created.map((c) => c.category || "Otro"));
      setExpanded((prev) => new Set([...prev, ...cats]));
    }
    if (created.length > 0 && skipped > 0) {
      toast("success", `${created.length} agregado${created.length === 1 ? "" : "s"}, ${skipped} duplicado${skipped === 1 ? "" : "s"} ignorado${skipped === 1 ? "" : "s"}`);
    } else if (created.length > 0) {
      toast("success", `${created.length} link${created.length === 1 ? "" : "s"} importado${created.length === 1 ? "" : "s"} ✓`);
    } else if (skipped > 0) {
      toast("info", `Todos los ${skipped} links ya estaban en tu bóveda`);
    }
    if (aiError) {
      toast("error", aiError);
    }
  };

  const handleSavedCategory = (id: string, category: string) => {
    setItems((prev) => prev.map((i) => i._id === id ? { ...i, category } : i));
    setExpanded((prev) => new Set(prev).add(category));
    toast("success", "Categoría actualizada");
  };

  // Detect duplicate paste in URL (when typing into add modal closed) — small UX touch
  // (The modal itself surfaces this, no global handler needed.)
  void normalizeUrlForDedupe;

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalCompleted = items.filter((i) => i.status === "completed").length;

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col">
        <TopBar hideAdd />

        <main className="flex-1 px-4 md:px-6 py-5 pb-32 md:pb-6 max-w-5xl mx-auto w-full">

          {/* ── Header ── */}
          <div className="mb-4">
            <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
              <div>
                <h1 className="text-2xl font-bold text-text-primary leading-tight">La Bóveda 🏛️</h1>
                <p className="text-[12px] text-text-muted mt-0.5">
                  {items.length === 0 ? "Tu base de conocimiento" : `${items.length} link${items.length === 1 ? "" : "s"} · ${totalCompleted} completado${totalCompleted === 1 ? "" : "s"} · ${existingCategories.length} categoría${existingCategories.length === 1 ? "" : "s"}`}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
                  style={{ background: "rgba(231,202,121,0.10)", borderColor: "rgba(231,202,121,0.28)", color: "#e7ca79" }}
                >
                  <Plus size={13} /> Agregar link
                </button>
                <button
                  onClick={() => setShowBulk(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
                  style={{ background: "rgba(168,85,247,0.10)", borderColor: "rgba(168,85,247,0.28)", color: "#c084fc" }}
                >
                  <Sparkles size={13} /> Bulk con IA
                </button>
                <button
                  onClick={() => setShowManageCats(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.10)", color: "#cbd5e1" }}
                  title="Renombrar / fusionar categorías"
                >
                  <FolderCog size={13} /> Categorías
                </button>
                {items.length > 0 && (
                  <button
                    onClick={handleFixEchoes}
                    disabled={fixingEchoes}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50"
                    style={{ background: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.28)", color: "#4ade80" }}
                    title="Repara resúmenes rotos/repetidos — sin gastar créditos de IA"
                  >
                    {fixingEchoes ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    {fixingEchoes ? "Reparando..." : "Reparar sin IA"}
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    onClick={() => handleReclassify(false)}
                    disabled={reclassifying}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50"
                    style={{ background: "rgba(56,189,248,0.10)", borderColor: "rgba(56,189,248,0.28)", color: "#7dd3fc" }}
                    title="Re-scrapear y reclasificar links sin resumen / categoría (usa créditos IA)"
                  >
                    {reclassifying ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                    {reclassifying ? "Reclasificando..." : "Reclasificar IA"}
                  </button>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por título, categoría, resumen, URL..."
                className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e8e8e8" }}
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {(["all", "unread", "in_progress", "completed"] as const).map((s) => {
                const labels: Record<typeof s, string> = { all: "Todos", unread: "No leídos", in_progress: "En proceso", completed: "Completados" };
                const active = statusFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors"
                    style={{
                      background: active ? "rgba(231,202,121,0.12)" : "rgba(255,255,255,0.03)",
                      borderColor: active ? "rgba(231,202,121,0.30)" : "rgba(255,255,255,0.06)",
                      color: active ? "#e7ca79" : "#9ca3af",
                    }}
                  >
                    {labels[s]}
                  </button>
                );
              })}
              <button
                onClick={() => setHideCompleted((v) => !v)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors"
                style={{
                  background: hideCompleted ? "rgba(231,202,121,0.12)" : "rgba(255,255,255,0.03)",
                  borderColor: hideCompleted ? "rgba(231,202,121,0.30)" : "rgba(255,255,255,0.06)",
                  color: hideCompleted ? "#e7ca79" : "#9ca3af",
                }}
              >
                {hideCompleted ? "Mostrando pendientes" : "Ocultar completados"}
              </button>

              <div className="ml-auto flex items-center gap-1 text-[11px]">
                <button onClick={expandAll} className="text-text-muted hover:text-text-primary px-2 py-1">Expandir todo</button>
                <span className="text-text-muted opacity-30">·</span>
                <button onClick={collapseAll} className="text-text-muted hover:text-text-primary px-2 py-1">Colapsar todo</button>
              </div>
            </div>
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={20} className="animate-spin text-[#e7ca79]" />
            </div>
          )}

          {/* ── Empty (no items at all) ── */}
          {!loading && items.length === 0 && (
            <div
              className="text-center py-16 rounded-2xl border"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              <p className="text-4xl mb-3">🏛️</p>
              <p className="text-text-primary font-semibold mb-1">Tu bóveda está vacía</p>
              <p className="text-sm text-text-muted mb-4 px-6">
                Pega un link manualmente o usa <span style={{ color: "#c084fc" }}>Bulk con IA</span> para procesar varios a la vez.
              </p>
              <div className="flex justify-center gap-2">
                <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  style={{ background: "linear-gradient(135deg, #e7ca79, #c4a94f)", color: "#1a1a1a" }}>
                  <Plus size={12} /> Agregar primero
                </button>
                <button onClick={() => setShowBulk(true)} className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff" }}>
                  <Sparkles size={12} /> Bulk con IA
                </button>
              </div>
            </div>
          )}

          {/* ── No matches ── */}
          {!loading && items.length > 0 && filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-text-muted text-sm">
                {query ? `Sin resultados para "${query}"` : "No hay links que coincidan con los filtros"}
              </p>
            </div>
          )}

          {/* ── List with sticky headers + drag-and-drop ── */}
          {!loading && grouped.length > 0 && (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}>
                {grouped.map(([cat, catItems]) => (
                  <CategorySection
                    key={cat}
                    category={cat}
                    items={catItems}
                    expanded={expanded.has(cat) || !!q}
                    onToggle={() => toggleSection(cat)}
                    selected={selected}
                    onToggleSelect={toggleSelect}
                    onCycleStatus={handleCycleStatus}
                    onDelete={handleDelete}
                    onEditCategory={setEditCatItem}
                    onTogglePin={handleTogglePin}
                    query={q}
                  />
                ))}
              </div>
            </DragDropContext>
          )}
        </main>
      </div>

      {/* ── Selection bar (floating) ── */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[120] px-3 py-2 rounded-2xl border flex items-center gap-2"
            style={{
              background: "rgba(24,24,24,0.95)",
              backdropFilter: "blur(20px)",
              borderColor: "rgba(231,202,121,0.25)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
            }}
          >
            <span className="text-xs font-semibold text-[#e7ca79] px-1.5">{selected.size} seleccionado{selected.size === 1 ? "" : "s"}</span>
            <div className="w-px h-5 bg-white/10" />
            <button onClick={() => handleBulkStatus("in_progress")} className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium hover:bg-white/5" style={{ color: "#60a5fa" }}>En proceso</button>
            <button onClick={() => handleBulkStatus("completed")} className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium hover:bg-white/5" style={{ color: "#e7ca79" }}>Completar</button>
            <button onClick={handleBulkDelete} className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium hover:bg-white/5" style={{ color: "#fca5a5" }}>Eliminar</button>
            <div className="w-px h-5 bg-white/10" />
            <button onClick={clearSelection} className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted" title="Cancelar selección">
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      <AddLinkModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={handleAdded}
        existingCategories={existingCategories}
      />
      <BulkAddModal
        open={showBulk}
        onClose={() => setShowBulk(false)}
        onCompleted={handleBulkCompleted}
      />
      <EditCategoryModal
        item={editCatItem}
        existingCategories={existingCategories}
        onClose={() => setEditCatItem(null)}
        onSaved={handleSavedCategory}
      />
      <ManageCategoriesModal
        open={showManageCats}
        onClose={() => setShowManageCats(false)}
        categories={existingCategories.map((name) => ({
          name,
          count: items.filter((i) => (i.category || "Sin Clasificar") === name).length,
        }))}
        onChanged={async () => {
          const r = await fetch("/api/vault");
          const data = await r.json();
          if (Array.isArray(data)) setItems(data);
          toast("success", "Categorías actualizadas");
        }}
        onCategoryCreated={(name) => {
          setManualCategories((prev) => prev.includes(name) ? prev : [...prev, name]);
          toast("success", `Categoría "${name}" creada`);
        }}
      />

      <Toaster toasts={toasts} />
    </div>
  );
}
