"use client";

import { useState } from "react";
import {
  Plus, X, Pencil, Check, GripVertical, Tags,
  ArrowUpToLine, ArrowDownToLine,
} from "lucide-react";
import {
  DragDropContext, Droppable, Draggable, DropResult,
} from "@hello-pangea/dnd";
import { CATEGORIES, Category } from "@/lib/types";
import { useSubcategories } from "@/lib/hooks/useSubcategories";

export default function SubcategoriesManager() {
  const { subcategories, loading, updateSubcategories } = useSubcategories();
  const [addingTo, setAddingTo] = useState<Category | null>(null);
  const [newSub, setNewSub] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [addToBeginning, setAddToBeginning] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("subcategory_add_position") === "beginning";
    }
    return false;
  });

  const toggleAddPosition = () => {
    const next = !addToBeginning;
    setAddToBeginning(next);
    localStorage.setItem("subcategory_add_position", next ? "beginning" : "end");
  };

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
      fromSubs.splice(source.index, 1);
      fromSubs.splice(destination.index, 0, subName);
      setSaving(true);
      try { await updateSubcategories(fromCat, fromSubs); }
      catch { showFeedback("Error al reordenar"); }
      finally { setSaving(false); }
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/subcategories/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subcategory: subName, fromCategory: fromCat, toCategory: toCat }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const refreshRes = await fetch("/api/subcategories");
      const refreshData = await refreshRes.json();
      if (refreshData.subcategories) {
        for (const cat of Object.keys(refreshData.subcategories) as Category[]) {
          await updateSubcategories(cat, refreshData.subcategories[cat]);
        }
      }
      showFeedback(`"${subName}" movida a ${CATEGORIES[toCat].label} (${data.tasksMoved} tarea${data.tasksMoved !== 1 ? "s" : ""} migrada${data.tasksMoved !== 1 ? "s" : ""})`);
    } catch { showFeedback("Error al mover subcategoria"); }
    finally { setSaving(false); }
  };

  const handleAdd = async (cat: Category) => {
    const val = newSub.trim();
    if (!val) return;
    const subs = subcategories[cat] || [];
    if (subs.includes(val)) return;
    setSaving(true);
    try {
      const updated = addToBeginning ? [val, ...subs] : [...subs, val];
      await updateSubcategories(cat, updated);
      setNewSub(""); setAddingTo(null);
      showFeedback(`"${val}" agregada a ${CATEGORIES[cat].label}`);
    } catch { showFeedback("Error al agregar"); }
    finally { setSaving(false); }
  };

  const handleRemove = async (cat: Category, idx: number) => {
    const subs = subcategories[cat] || [];
    if (subs.length <= 1) return;
    const name = subs[idx];
    setSaving(true);
    try {
      await updateSubcategories(cat, subs.filter((_: string, i: number) => i !== idx));
      showFeedback(`"${name}" eliminada`);
    } catch { showFeedback("Error al eliminar"); }
    finally { setSaving(false); }
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
    } catch { showFeedback("Error al renombrar"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-bg-secondary border border-border p-4">
        <div className="h-40 rounded-lg bg-bg-tertiary animate-pulse" />
      </div>
    );
  }

  const categories = Object.keys(CATEGORIES) as Category[];

  return (
    <div className="rounded-xl bg-bg-secondary border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tags size={16} className="text-text-muted" />
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Subcategorías</h3>
              <p className="text-xs text-text-muted">Arrastra entre columnas para moverlas con sus tareas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {feedback && (
              <span className="text-xs text-green-400 font-medium max-w-[180px] text-right">{feedback}</span>
            )}
            {saving && <span className="text-[10px] text-text-muted">Guardando...</span>}
            <button
              onClick={toggleAddPosition}
              title={addToBeginning ? "Nuevas al inicio" : "Nuevas al final"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                addToBeginning
                  ? "bg-[#e7ca79]/15 text-[#e7ca79] border-[#e7ca79]/30 hover:bg-[#e7ca79]/25"
                  : "bg-bg-tertiary text-text-muted border-border hover:bg-bg-hover hover:text-text-secondary"
              }`}
            >
              {addToBeginning ? <ArrowUpToLine size={12} /> : <ArrowDownToLine size={12} />}
              {addToBeginning ? "Al inicio" : "Al final"}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {categories.map((cat) => {
              const config = CATEGORIES[cat];
              const subs = subcategories[cat] || [];
              return (
                <div key={cat} className="rounded-lg border border-border overflow-hidden">
                  <div className="px-3 py-2 border-b" style={{ borderColor: `${config.color}30`, backgroundColor: `${config.color}08` }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: config.color }}>{config.icon} {config.label}</span>
                      <span className="text-xs opacity-50" style={{ color: config.color }}>{subs.length}</span>
                    </div>
                  </div>
                  <Droppable droppableId={cat}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef} {...provided.droppableProps}
                        className={`p-2 min-h-[100px] space-y-1 transition-colors ${snapshot.isDraggingOver ? "bg-bg-tertiary" : "bg-bg-primary/50"}`}
                      >
                        {subs.map((sub: string, idx: number) => {
                          const key = `${cat}-${idx}`;
                          const isEditing = editingKey === key;
                          return (
                            <Draggable key={`${cat}-${sub}`} draggableId={`${cat}::${sub}`} index={idx}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef} {...provided.draggableProps}
                                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md group transition-all ${
                                    snapshot.isDragging ? "bg-bg-secondary shadow-lg border border-border" : "bg-bg-tertiary hover:bg-bg-secondary"
                                  }`}
                                >
                                  {isEditing ? (
                                    <>
                                      <input
                                        type="text" value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(cat, idx); if (e.key === "Escape") setEditingKey(null); }}
                                        autoFocus
                                        className="flex-1 px-1.5 py-0.5 rounded bg-bg-primary border border-border text-text-primary text-xs focus:outline-none focus:border-[#e7ca79]/50"
                                      />
                                      <button onClick={() => handleSaveEdit(cat, idx)} className="p-0.5 text-green-400"><Check size={12} /></button>
                                      <button onClick={() => setEditingKey(null)} className="p-0.5 text-text-muted"><X size={12} /></button>
                                    </>
                                  ) : (
                                    <>
                                      <span {...provided.dragHandleProps} className="text-text-muted/40 hover:text-text-muted cursor-grab active:cursor-grabbing">
                                        <GripVertical size={12} />
                                      </span>
                                      <span className="flex-1 text-xs text-text-primary truncate">{sub}</span>
                                      <button
                                        onClick={() => { setEditingKey(key); setEditValue(sub); }}
                                        className="p-0.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                                      ><Pencil size={10} /></button>
                                      <button
                                        onClick={() => handleRemove(cat, idx)}
                                        disabled={subs.length <= 1}
                                        className="p-0.5 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-20"
                                      ><X size={10} /></button>
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
                  <div className="px-2 pb-2">
                    {addingTo === cat ? (
                      <div className="flex gap-1">
                        <input
                          type="text" value={newSub}
                          onChange={(e) => setNewSub(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(cat); if (e.key === "Escape") { setAddingTo(null); setNewSub(""); } }}
                          autoFocus placeholder="Nombre..."
                          className="flex-1 px-2 py-1 rounded bg-bg-tertiary border border-border text-text-primary text-xs placeholder:text-text-muted focus:outline-none focus:border-[#e7ca79]/50"
                        />
                        <button onClick={() => handleAdd(cat)} disabled={saving || !newSub.trim()} className="px-2 py-1 rounded text-xs font-medium bg-[#e7ca79]/10 text-[#e7ca79] disabled:opacity-40">
                          <Check size={12} />
                        </button>
                        <button onClick={() => { setAddingTo(null); setNewSub(""); }} className="px-1 py-1 rounded text-xs text-text-muted">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingTo(cat); setNewSub(""); }}
                        className="flex items-center gap-1 w-full px-2 py-1 rounded text-xs text-text-muted hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
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
