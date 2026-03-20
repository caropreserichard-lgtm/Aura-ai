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
  GripVertical,
  Tags,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { CATEGORIES, Category } from "@/lib/types";
import { useSubcategories } from "@/lib/hooks/useSubcategories";

function SubcategoriesManager() {
  const { subcategories, loading, updateSubcategories } = useSubcategories();
  const [addingTo, setAddingTo] = useState<Category | null>(null);
  const [newSub, setNewSub] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const fromCat = source.droppableId as Category;
    const toCat = destination.droppableId as Category;
    const fromSubs = [...(subcategories[fromCat] || [])];
    const subName = fromSubs[source.index];

    if (fromCat === toCat) {
      // Reorder within same category
      fromSubs.splice(source.index, 1);
      fromSubs.splice(destination.index, 0, subName);
      setSaving(true);
      try {
        await updateSubcategories(fromCat, fromSubs);
      } catch {
        showFeedback("Error al reordenar");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Move between categories — call the move API (updates subcats + tasks)
    setSaving(true);
    try {
      const res = await fetch("/api/subcategories/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subcategory: subName,
          fromCategory: fromCat,
          toCategory: toCat,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Refresh subcategories from server
      const refreshRes = await fetch("/api/subcategories");
      const refreshData = await refreshRes.json();
      if (refreshData.subcategories) {
        for (const cat of Object.keys(refreshData.subcategories) as Category[]) {
          await updateSubcategories(cat, refreshData.subcategories[cat]);
        }
      }

      showFeedback(
        `"${subName}" movida a ${CATEGORIES[toCat].label} (${data.tasksMoved} tarea${data.tasksMoved !== 1 ? "s" : ""} migrada${data.tasksMoved !== 1 ? "s" : ""})`
      );
    } catch {
      showFeedback("Error al mover subcategoria");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (cat: Category) => {
    const val = newSub.trim();
    if (!val) return;
    const subs = subcategories[cat] || [];
    if (subs.includes(val)) return;
    setSaving(true);
    try {
      await updateSubcategories(cat, [...subs, val]);
      setNewSub("");
      setAddingTo(null);
      showFeedback(`"${val}" agregada a ${CATEGORIES[cat].label}`);
    } catch {
      showFeedback("Error al agregar");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (cat: Category, idx: number) => {
    const subs = subcategories[cat] || [];
    if (subs.length <= 1) return;
    const name = subs[idx];
    setSaving(true);
    try {
      await updateSubcategories(
        cat,
        subs.filter((_: string, i: number) => i !== idx)
      );
      showFeedback(`"${name}" eliminada`);
    } catch {
      showFeedback("Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (cat: Category, idx: number) => {
    setEditingKey(`${cat}-${idx}`);
    setEditValue((subcategories[cat] || [])[idx]);
  };

  const handleSaveEdit = async (cat: Category, idx: number) => {
    const val = editValue.trim();
    if (!val) return;
    setSaving(true);
    try {
      const updated = [...(subcategories[cat] || [])];
      updated[idx] = val;
      await updateSubcategories(cat, updated);
      setEditingKey(null);
      showFeedback("Renombrada");
    } catch {
      showFeedback("Error al renombrar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-bg-secondary border border-white/5 p-4">
        <div className="h-60 rounded-lg bg-bg-tertiary animate-pulse" />
      </div>
    );
  }

  const categories = Object.keys(CATEGORIES) as Category[];

  return (
    <div className="rounded-xl bg-bg-secondary border border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex items-center justify-center">
              <Tags size={20} className="text-accent-purple" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-sm">Subcategorias</h2>
              <p className="text-xs text-text-muted">
                Arrastra subcategorias entre columnas para moverlas con sus tareas
              </p>
            </div>
          </div>
          {feedback && (
            <span className="text-xs text-accent-emerald font-medium animate-pulse max-w-[200px] text-right">
              {feedback}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {categories.map((cat) => {
              const config = CATEGORIES[cat];
              const subs = subcategories[cat] || [];

              return (
                <div
                  key={cat}
                  className="rounded-lg border border-white/5 overflow-hidden"
                >
                  {/* Column header */}
                  <div
                    className="px-3 py-2 border-b"
                    style={{
                      borderColor: `${config.color}30`,
                      backgroundColor: `${config.color}08`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-bold"
                        style={{ color: config.color }}
                      >
                        {config.icon} {config.label}
                      </span>
                      <span
                        className="text-xs opacity-50"
                        style={{ color: config.color }}
                      >
                        {subs.length}
                      </span>
                    </div>
                  </div>

                  {/* Droppable area */}
                  <Droppable droppableId={cat}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-2 min-h-[120px] space-y-1 transition-colors ${
                          snapshot.isDraggingOver
                            ? "bg-white/5"
                            : "bg-bg-primary/50"
                        }`}
                      >
                        {subs.map((sub: string, idx: number) => {
                          const key = `${cat}-${idx}`;
                          const isEditing = editingKey === key;

                          return (
                            <Draggable
                              key={`${cat}-${sub}`}
                              draggableId={`${cat}::${sub}`}
                              index={idx}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md group transition-all ${
                                    snapshot.isDragging
                                      ? "bg-bg-secondary shadow-lg border border-white/10"
                                      : "bg-bg-tertiary hover:bg-bg-secondary"
                                  }`}
                                >
                                  {isEditing ? (
                                    <>
                                      <input
                                        type="text"
                                        value={editValue}
                                        onChange={(e) =>
                                          setEditValue(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter")
                                            handleSaveEdit(cat, idx);
                                          if (e.key === "Escape")
                                            setEditingKey(null);
                                        }}
                                        autoFocus
                                        className="flex-1 px-1.5 py-0.5 rounded bg-bg-primary border border-white/10 text-text-primary text-xs focus:outline-none focus:border-accent-purple/50"
                                      />
                                      <button
                                        onClick={() =>
                                          handleSaveEdit(cat, idx)
                                        }
                                        className="p-0.5 text-accent-emerald"
                                      >
                                        <Check size={12} />
                                      </button>
                                      <button
                                        onClick={() => setEditingKey(null)}
                                        className="p-0.5 text-text-muted"
                                      >
                                        <X size={12} />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <span
                                        {...provided.dragHandleProps}
                                        className="text-text-muted/40 hover:text-text-muted cursor-grab active:cursor-grabbing"
                                      >
                                        <GripVertical size={12} />
                                      </span>
                                      <span className="flex-1 text-xs text-text-primary truncate">
                                        {sub}
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleStartEdit(cat, idx)
                                        }
                                        className="p-0.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Pencil size={10} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleRemove(cat, idx)
                                        }
                                        disabled={subs.length <= 1}
                                        className="p-0.5 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-20"
                                      >
                                        <X size={10} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  {/* Add button */}
                  <div className="px-2 pb-2">
                    {addingTo === cat ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={newSub}
                          onChange={(e) => setNewSub(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAdd(cat);
                            if (e.key === "Escape") {
                              setAddingTo(null);
                              setNewSub("");
                            }
                          }}
                          autoFocus
                          placeholder="Nombre..."
                          className="flex-1 px-2 py-1 rounded bg-bg-tertiary border border-white/5 text-text-primary text-xs placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50"
                        />
                        <button
                          onClick={() => handleAdd(cat)}
                          disabled={saving || !newSub.trim()}
                          className="px-2 py-1 rounded text-xs font-medium bg-accent-purple/10 text-accent-purple disabled:opacity-40"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => {
                            setAddingTo(null);
                            setNewSub("");
                          }}
                          className="px-1 py-1 rounded text-xs text-text-muted"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAddingTo(cat);
                          setNewSub("");
                        }}
                        className="flex items-center gap-1 w-full px-2 py-1 rounded text-xs text-text-muted hover:text-text-secondary hover:bg-white/5 transition-colors"
                      >
                        <Plus size={12} /> Agregar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
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

        <div className="p-4 md:p-6 max-w-5xl space-y-6 pb-24 md:pb-6">
          <h1 className="font-heading font-bold text-xl">Configuracion</h1>

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
          <div className="rounded-xl bg-bg-secondary border border-white/5 overflow-hidden max-w-2xl">
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
                  <p className="text-sm text-text-muted">
                    Conecta tu cuenta de Google para sincronizar tareas con fecha
                    a tu calendario automaticamente.
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
          <div className="rounded-xl bg-bg-secondary border border-white/5 p-4 max-w-2xl">
            <h2 className="font-heading font-bold text-sm mb-2">
              Acerca de RICKY FLOW
            </h2>
            <div className="space-y-1 text-xs text-text-muted">
              <p>Version: 1.0.0 (Fase 3)</p>
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
