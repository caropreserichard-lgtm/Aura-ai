"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  ExternalLink,
  Lightbulb,
  Trash2,
  ChevronDown,
  Filter,
  TrendingUp,
  Zap,
  BookOpen,
  ShoppingBag,
  Bitcoin,
  Briefcase,
  Leaf,
  HelpCircle,
  Check,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type VaultStatus = "unread" | "in_progress" | "completed";

interface VaultItem {
  _id: string;
  url: string;
  title: string;
  category: string;
  status: VaultStatus;
  insight: string;
  idea: string;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VAULT_CATEGORIES = [
  "Marketing",
  "Crypto",
  "Negocios",
  "Desarrollo",
  "Aprendizaje",
  "Lifestyle",
  "Otro",
] as const;

const CATEGORY_CONFIG: Record<string, { icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>; color: string; glow: string }> = {
  Marketing:   { icon: TrendingUp, color: "#e7ca79", glow: "rgba(231,202,121,0.15)" },
  Crypto:      { icon: Bitcoin,    color: "#f97316", glow: "rgba(249,115,22,0.15)"  },
  Negocios:    { icon: Briefcase,  color: "#3b82f6", glow: "rgba(59,130,246,0.15)" },
  Desarrollo:  { icon: Zap,        color: "#a855f7", glow: "rgba(168,85,247,0.15)" },
  Aprendizaje: { icon: BookOpen,   color: "#10b981", glow: "rgba(16,185,129,0.15)" },
  Lifestyle:   { icon: Leaf,       color: "#ec4899", glow: "rgba(236,72,153,0.15)" },
  Otro:        { icon: HelpCircle, color: "#6b7280", glow: "rgba(107,114,128,0.15)" },
};

const STATUS_CONFIG: Record<VaultStatus, { label: string; bg: string; text: string; border: string }> = {
  unread:      { label: "No leído",   bg: "rgba(107,114,128,0.15)", text: "#9ca3af", border: "rgba(107,114,128,0.3)" },
  in_progress: { label: "En proceso", bg: "rgba(59,130,246,0.15)",  text: "#60a5fa", border: "rgba(59,130,246,0.3)"  },
  completed:   { label: "Completado", bg: "rgba(231,202,121,0.15)", text: "#e7ca79", border: "rgba(231,202,121,0.3)" },
};

const STATUS_ORDER: VaultStatus[] = ["unread", "in_progress", "completed"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}

// ─── Card Component ───────────────────────────────────────────────────────────

function VaultCard({
  item,
  onStatusChange,
  onIdeaChange,
  onDelete,
}: {
  item: VaultItem;
  onStatusChange: (id: string, status: VaultStatus) => void;
  onIdeaChange: (id: string, idea: string) => void;
  onDelete: (id: string) => void;
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [ideaText, setIdeaText] = useState(item.idea || "");
  const [savingIdea, setSavingIdea] = useState(false);
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const statusCfg = STATUS_CONFIG[item.status];

  const saveIdea = async () => {
    if (ideaText === item.idea) { setIdeaOpen(false); return; }
    setSavingIdea(true);
    await fetch(`/api/vault/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: ideaText }),
    });
    onIdeaChange(item._id, ideaText);
    setSavingIdea(false);
    setIdeaOpen(false);
  };

  useEffect(() => {
    if (ideaOpen) ideaRef.current?.focus();
  }, [ideaOpen]);

  return (
    <div
      className="relative rounded-xl border p-4 transition-all duration-200 group"
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderColor: "rgba(255,255,255,0.08)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-text-primary hover:text-[#e7ca79] transition-colors line-clamp-2 leading-snug"
          >
            {item.title}
          </a>
          <p className="text-[11px] text-text-muted mt-0.5">{getDomain(item.url)}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Idea bombilla */}
          <button
            onClick={() => setIdeaOpen((o) => !o)}
            title="Agregar idea de negocio"
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: ideaText ? "#e7ca79" : "#666",
              background: ideaText ? "rgba(231,202,121,0.1)" : "transparent",
            }}
          >
            <Lightbulb size={14} />
          </button>

          {/* Open link */}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "#666" }}
          >
            <ExternalLink size={14} />
          </a>

          {/* Delete */}
          <button
            onClick={() => onDelete(item._id)}
            className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            style={{ color: "#d4544e" }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Insight */}
      {item.insight && (
        <p
          className="text-[11px] italic mb-3 px-2.5 py-1.5 rounded-lg"
          style={{
            color: "#9ca3af",
            background: "rgba(255,255,255,0.04)",
            borderLeft: "2px solid rgba(231,202,121,0.3)",
          }}
        >
          💡 {item.insight}
        </p>
      )}

      {/* Idea note */}
      {ideaOpen && (
        <div className="mb-3">
          <textarea
            ref={ideaRef}
            value={ideaText}
            onChange={(e) => setIdeaText(e.target.value)}
            placeholder="Escribe tu idea de negocio rápida..."
            rows={2}
            className="w-full text-xs rounded-lg px-3 py-2 resize-none outline-none"
            style={{
              background: "rgba(231,202,121,0.06)",
              border: "1px solid rgba(231,202,121,0.2)",
              color: "#e8e8e8",
            }}
          />
          <div className="flex gap-1.5 mt-1.5 justify-end">
            <button
              onClick={() => setIdeaOpen(false)}
              className="p-1 rounded"
              style={{ color: "#666" }}
            >
              <X size={12} />
            </button>
            <button
              onClick={saveIdea}
              disabled={savingIdea}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium"
              style={{ background: "rgba(231,202,121,0.15)", color: "#e7ca79" }}
            >
              <Check size={10} />
              {savingIdea ? "..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-text-muted">
          Agregado el {formatDate(item.created_at)}
        </span>

        {/* Status badge dropdown */}
        <div className="relative">
          <button
            onClick={() => setStatusOpen((o) => !o)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors"
            style={{
              background: statusCfg.bg,
              color: statusCfg.text,
              borderColor: statusCfg.border,
            }}
          >
            {statusCfg.label}
            <ChevronDown size={10} />
          </button>

          {statusOpen && (
            <div
              className="absolute bottom-full right-0 mb-1 rounded-lg border overflow-hidden z-20 min-w-[120px]"
              style={{
                background: "rgba(30,30,30,0.95)",
                backdropFilter: "blur(12px)",
                borderColor: "rgba(255,255,255,0.1)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}
            >
              {STATUS_ORDER.map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => {
                      onStatusChange(item._id, s);
                      setStatusOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[11px] transition-colors hover:bg-white/5"
                    style={{ color: cfg.text }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Category Section ──────────────────────────────────────────────────────────

function CategorySection({
  category,
  items,
  onStatusChange,
  onIdeaChange,
  onDelete,
}: {
  category: string;
  items: VaultItem[];
  onStatusChange: (id: string, status: VaultStatus) => void;
  onIdeaChange: (id: string, idea: string) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG["Otro"];
  const Icon = cfg.icon;
  const completed = items.filter((i) => i.status === "completed").length;
  const total = items.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="mb-10">
      {/* Category header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: cfg.glow, border: `1px solid ${cfg.color}30` }}
        >
          <Icon size={16} strokeWidth={1.5} color={cfg.color} />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-text-primary">{category}</h2>
            <span className="text-[11px] text-text-muted">
              {completed}/{total} completados
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-1 h-1 w-32 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: cfg.color }}
            />
          </div>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => (
          <VaultCard
            key={item._id}
            item={item}
            onStatusChange={onStatusChange}
            onIdeaChange={onIdeaChange}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VaultPage() {
  const router = useRouter();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideCompleted, setHideCompleted] = useState(false);

  useEffect(() => {
    fetch("/api/vault")
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setItems(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleStatusChange = async (id: string, status: VaultStatus) => {
    setItems((prev) => prev.map((i) => i._id === id ? { ...i, status } : i));
    await fetch(`/api/vault/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const handleIdeaChange = (id: string, idea: string) => {
    setItems((prev) => prev.map((i) => i._id === id ? { ...i, idea } : i));
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
    await fetch(`/api/vault/${id}`, { method: "DELETE" });
  };

  const filteredItems = hideCompleted
    ? items.filter((i) => i.status !== "completed")
    : items;

  const grouped = VAULT_CATEGORIES.reduce((acc, cat) => {
    const catItems = filteredItems.filter((i) => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, VaultItem[]>);

  // Items in uncategorized bucket (category not in VAULT_CATEGORIES)
  const unknownItems = filteredItems.filter(
    (i) => !VAULT_CATEGORIES.includes(i.category as typeof VAULT_CATEGORIES[number])
  );
  if (unknownItems.length > 0) grouped["Otro"] = [...(grouped["Otro"] || []), ...unknownItems];

  const totalItems = items.length;
  const totalCompleted = items.filter((i) => i.status === "completed").length;

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col">
        <TopBar hideAdd />

        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">

          {/* Page header */}
          <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">
                La Bóveda 🏛️
              </h1>
              <p className="text-sm text-text-muted">
                Tu base de conocimiento personal — {totalCompleted}/{totalItems} completados
              </p>
            </div>

            {/* Filter button */}
            <button
              onClick={() => setHideCompleted((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all"
              style={{
                background: hideCompleted ? "rgba(231,202,121,0.12)" : "rgba(255,255,255,0.04)",
                borderColor: hideCompleted ? "rgba(231,202,121,0.4)" : "rgba(255,255,255,0.08)",
                color: hideCompleted ? "#e7ca79" : "#9ca3af",
              }}
            >
              <Filter size={14} />
              {hideCompleted ? "Mostrar todo" : "Solo pendientes"}
            </button>
          </div>

          {/* Empty state */}
          {!loading && totalItems === 0 && (
            <div
              className="text-center py-20 rounded-2xl border"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <p className="text-4xl mb-3">🏛️</p>
              <p className="text-text-primary font-semibold mb-1">Tu bóveda está vacía</p>
              <p className="text-sm text-text-muted">
                Pega un link en el chatbox de Tayrona para empezar a guardar conocimiento
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-white/10 border-t-[#e7ca79] rounded-full animate-spin" />
            </div>
          )}

          {/* Content */}
          {!loading && Object.entries(grouped).map(([cat, catItems]) => (
            <CategorySection
              key={cat}
              category={cat}
              items={catItems}
              onStatusChange={handleStatusChange}
              onIdeaChange={handleIdeaChange}
              onDelete={handleDelete}
            />
          ))}

          {/* Filtered empty */}
          {!loading && totalItems > 0 && filteredItems.length === 0 && (
            <div className="text-center py-16">
              <p className="text-text-muted text-sm">
                🎯 Todo completado. Activa &ldquo;Mostrar todo&rdquo; para ver el historial.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
