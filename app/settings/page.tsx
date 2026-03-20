"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  Calendar,
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Pencil,
  Check,
  RotateCcw,
  Tags,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { CATEGORIES, Category } from "@/lib/types";
import { useSubcategories } from "@/lib/hooks/useSubcategories";

function SubcategoriesManager() {
  const { subcategories, loading, updateSubcategories, resetToDefaults } =
    useSubcategories();
  const [activeCategory, setActiveCategory] = useState<Category>("trabajo");
  const [newSub, setNewSub] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentSubs = subcategories[activeCategory] || [];

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleAdd = async () => {
    const val = newSub.trim();
    if (!val || currentSubs.includes(val)) return;
    setSaving(true);
    try {
      await updateSubcategories(activeCategory, [...currentSubs, val]);
      setNewSub("");
      showFeedback("Agregada");
    } catch {
      showFeedback("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (idx: number) => {
    if (currentSubs.length <= 1) return;
    setSaving(true);
    try {
      const updated = currentSubs.filter((_, i) => i !== idx);
      await updateSubcategories(activeCategory, updated);
      showFeedback("Eliminada");
    } catch {
      showFeedback("Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditValue(currentSubs[idx]);
  };

  const handleSaveEdit = async () => {
    if (editingIdx === null) return;
    const val = editValue.trim();
    if (!val) return;
    setSaving(true);
    try {
      const updated = [...currentSubs];
      updated[editingIdx] = val;
      await updateSubcategories(activeCategory, updated);
      setEditingIdx(null);
      showFeedback("Renombrada");
    } catch {
      showFeedback("Error al renombrar");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await resetToDefaults(activeCategory);
      showFeedback("Restaurado a defaults");
    } catch {
      showFeedback("Error al restaurar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-bg-secondary border border-white/5 p-4">
        <div className="h-40 rounded-lg bg-bg-tertiary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-bg-secondary border border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex items-center justify-center">
            <Tags size={20} className="text-accent-purple" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm">Subcategorias</h2>
            <p className="text-xs text-text-muted">
              Personaliza las subcategorias de cada categoria
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORIES) as Category[]).map((cat) => {
            const config = CATEGORIES[cat];
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setEditingIdx(null);
                  setNewSub("");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive ? "border-2" : "border border-white/5 hover:border-white/10"
                }`}
                style={
                  isActive
                    ? {
                        borderColor: config.color,
                        backgroundColor: `${config.color}15`,
                        color: config.color,
                      }
                    : {}
                }
              >
                {config.icon} {config.label}
                <span className="opacity-60">({(subcategories[cat] || []).length})</span>
              </button>
            );
          })}
        </div>

        {/* Subcategory list */}
        <div className="space-y-1.5">
          {currentSubs.map((sub, idx) => (
            <div
              key={`${activeCategory}-${idx}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-tertiary group"
            >
              {editingIdx === idx ? (
                <>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") setEditingIdx(null);
                    }}
                    autoFocus
                    className="flex-1 px-2 py-1 rounded bg-bg-primary border border-white/10 text-text-primary text-sm focus:outline-none focus:border-accent-purple/50"
                  />
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="p-1 rounded hover:bg-accent-emerald/10 text-accent-emerald"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => setEditingIdx(null)}
                    className="p-1 rounded hover:bg-white/5 text-text-muted"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-text-primary">{sub}</span>
                  <button
                    onClick={() => handleStartEdit(idx)}
                    className="p-1 rounded hover:bg-white/5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleRemove(idx)}
                    disabled={currentSubs.length <= 1}
                    className="p-1 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-20"
                  >
                    <X size={12} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="Nueva subcategoria..."
            className="flex-1 px-3 py-2 rounded-lg bg-bg-tertiary border border-white/5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !newSub.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/20 text-sm font-medium transition-colors disabled:opacity-40"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>

        {/* Reset + feedback */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
          >
            <RotateCcw size={12} /> Restaurar defaults
          </button>
          {feedback && (
            <span className="text-xs text-accent-emerald animate-pulse">
              {feedback}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [calendarStatus, setCalendarStatus] = useState<{
    connected: boolean;
    email?: string;
  }>({ connected: false });
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const success = searchParams.get("success");
  const error = searchParams.get("error");

  useEffect(() => {
    fetch("/api/calendar/status")
      .then((r) => r.json())
      .then(setCalendarStatus)
      .catch(() => setCalendarStatus({ connected: false }))
      .finally(() => setLoading(false));
  }, []);

  const handleDisconnect = async () => {
    await fetch("/api/calendar/status", { method: "DELETE" });
    setCalendarStatus({ connected: false });
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setSyncResult(`Error: ${data.error}`);
      } else {
        setSyncResult(
          `Sincronizadas ${data.synced} de ${data.total} tareas con fecha`
        );
      }
    } catch {
      setSyncResult("Error al sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-20 lg:ml-56">
        <TopBar onAddTask={() => {}} />

        <div className="p-4 md:p-6 max-w-2xl space-y-6 pb-24 md:pb-6">
          <h1 className="font-heading font-bold text-xl">Configuraci&oacute;n</h1>

          {/* Success/Error messages */}
          {success === "connected" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald text-sm">
              <CheckCircle2 size={16} />
              Google Calendar conectado exitosamente
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={16} />
              Error al conectar: {error.replace(/_/g, " ")}
            </div>
          )}

          {/* Subcategories manager */}
          <SubcategoriesManager />

          {/* Google Calendar section */}
          <div className="rounded-xl bg-bg-secondary border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                  <Calendar size={20} className="text-accent-blue" />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-sm">
                    Google Calendar
                  </h2>
                  <p className="text-xs text-text-muted">
                    Sincroniza tus tareas con Google Calendar
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {loading ? (
                <div className="h-12 rounded-lg bg-bg-tertiary animate-pulse" />
              ) : calendarStatus.connected ? (
                <>
                  {/* Connected state */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent-emerald/5 border border-accent-emerald/10">
                    <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
                    <div className="flex-1">
                      <p className="text-sm text-text-primary">Conectado</p>
                      <p className="text-xs text-text-muted">
                        {calendarStatus.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/20 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <RefreshCw
                        size={16}
                        className={syncing ? "animate-spin" : ""}
                      />
                      {syncing ? "Sincronizando..." : "Sincronizar ahora"}
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors"
                    >
                      <Unlink size={16} />
                      Desconectar
                    </button>
                  </div>

                  {syncResult && (
                    <p className="text-xs text-text-muted bg-white/5 p-2 rounded-lg">
                      {syncResult}
                    </p>
                  )}
                </>
              ) : (
                <>
                  {/* Disconnected state */}
                  <p className="text-sm text-text-muted">
                    Conecta tu cuenta de Google para sincronizar tareas con fecha
                    a tu calendario autom&aacute;ticamente.
                  </p>
                  <a
                    href="/api/calendar/auth"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 font-medium text-sm transition-colors border border-accent-blue/20"
                  >
                    <Link2 size={16} />
                    Conectar Google Calendar
                  </a>

                  <div className="p-3 rounded-lg bg-white/5 space-y-1">
                    <p className="text-xs text-text-muted font-medium">
                      Requisitos:
                    </p>
                    <ul className="text-xs text-text-muted space-y-0.5 list-disc list-inside">
                      <li>
                        Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en
                        .env.local
                      </li>
                      <li>
                        Crea un proyecto en{" "}
                        <span className="text-accent-blue">
                          Google Cloud Console
                        </span>
                      </li>
                      <li>Habilita la Google Calendar API</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* App info */}
          <div className="rounded-xl bg-bg-secondary border border-white/5 p-4">
            <h2 className="font-heading font-bold text-sm mb-2">
              Acerca de RICKY FLOW
            </h2>
            <div className="space-y-1 text-xs text-text-muted">
              <p>Versi&oacute;n: 1.0.0 (Fase 3)</p>
              <p>Stack: Next.js + MongoDB + Claude AI</p>
              <p>
                Features: Kanban, Deep Work, PWA, Google Calendar
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg-primary">
          <div className="w-10 h-10 border-4 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
