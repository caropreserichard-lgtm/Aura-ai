"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, X, ExternalLink, GripVertical, Pencil, Trash2, Check,
  GraduationCap, Sparkles, Zap, Video, Folder, Wrench, BookOpen,
  Code, Globe, Music, Camera, Palette, Shield, Database, Search,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { ToolCategory, ToolItem } from "@/lib/toolsData";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  GraduationCap, Sparkles, Zap, Video, Folder, Wrench, BookOpen,
  Code, Globe, Music, Camera, Palette, Shield, Database, Search,
};

const CATEGORY_COLORS = ["#8B5CF6", "#F59E0B", "#10B981", "#EC4899", "#3B82F6", "#EF4444", "#6366F1", "#14B8A6", "#F97316", "#84CC16"];
const CATEGORY_ICONS = ["GraduationCap", "Sparkles", "Zap", "Video", "Folder", "Wrench", "BookOpen", "Code", "Globe", "Camera"];

function getFavicon(url: string) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch { return null; }
}

export default function ToolsPage() {
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | "all">("all");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[4]);
  const [newCatIcon, setNewCatIcon] = useState("Folder");
  const [addingToolTo, setAddingToolTo] = useState<string | null>(null);
  const [newToolName, setNewToolName] = useState("");
  const [newToolUrl, setNewToolUrl] = useState("");
  const [newToolDesc, setNewToolDesc] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/tools");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch { setCategories([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const apiAction = async (body: Record<string, unknown>) => {
    await fetch("/api/tools", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    fetchCategories();
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await apiAction({ action: "add_category", name: newCatName.trim(), color: newCatColor, icon: newCatIcon });
    setNewCatName(""); setShowNewCategory(false);
  };

  const deleteCategory = (catId: string) => apiAction({ action: "delete_category", categoryId: catId });

  const renameCategory = async (catId: string) => {
    if (!editCatName.trim()) return;
    await apiAction({ action: "update_category", categoryId: catId, name: editCatName.trim() });
    setEditingCat(null);
  };

  const addTool = async (catId: string) => {
    if (!newToolName.trim() || !newToolUrl.trim()) return;
    let url = newToolUrl.trim();
    if (!/^https?:\/\//.test(url)) url = "https://" + url;
    await apiAction({ action: "add_tool", categoryId: catId, name: newToolName.trim(), url, description: newToolDesc.trim() });
    setNewToolName(""); setNewToolUrl(""); setNewToolDesc(""); setAddingToolTo(null);
  };

  const deleteTool = (catId: string, toolId: string) => apiAction({ action: "delete_tool", categoryId: catId, toolId });

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === "CATEGORY") {
      const reordered = [...categories];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      setCategories(reordered);
      await apiAction({ action: "reorder_categories", order: reordered.map((c) => c.id) });
      return;
    }

    // Tool drag
    const fromCatId = source.droppableId;
    const toCatId = destination.droppableId;

    if (fromCatId === toCatId) {
      const cat = categories.find((c) => c.id === fromCatId);
      if (!cat) return;
      const tools = [...cat.tools];
      const [moved] = tools.splice(source.index, 1);
      tools.splice(destination.index, 0, moved);
      setCategories(categories.map((c) => c.id === fromCatId ? { ...c, tools } : c));
      await apiAction({ action: "reorder_tools", categoryId: fromCatId, toolIds: tools.map((t) => t.id) });
    } else {
      const fromCat = categories.find((c) => c.id === fromCatId);
      if (!fromCat) return;
      const tool = fromCat.tools[source.index];
      setCategories(categories.map((c) => {
        if (c.id === fromCatId) return { ...c, tools: c.tools.filter((_, i) => i !== source.index) };
        if (c.id === toCatId) {
          const newTools = [...c.tools];
          newTools.splice(destination.index, 0, tool);
          return { ...c, tools: newTools };
        }
        return c;
      }));
      await apiAction({ action: "move_tool", fromCategoryId: fromCatId, toCategoryId: toCatId, toolId: tool.id });
    }
  };

  const filtered = filter === "all" ? categories : categories.filter((c) => c.id === filter);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar onAddTask={() => setShowNewCategory(true)} />
        <div className="p-4 md:p-6 pb-24 md:pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg tools-header-glow flex items-center justify-center">
                <Wrench size={18} className="text-[#D4A04E]" />
              </div>
              <h1 className="font-heading font-semibold text-lg">Tools</h1>
            </div>
            <button onClick={() => setShowNewCategory(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl tools-stone-btn text-[12px] font-medium transition-all">
              <Plus size={14} /> New Category
            </button>
          </div>

          {/* Category Filter — Piedra tallada buttons */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4" style={{ scrollbarWidth: "none" }}>
            <button onClick={() => setFilter("all")}
              className={`px-4 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all ${
                filter === "all" ? "tools-stone-btn-active" : "tools-stone-btn"
              }`}>
              All
            </button>
            {categories.map((cat) => {
              const isActive = filter === cat.id;
              return (
                <button key={cat.id} onClick={() => setFilter(isActive ? "all" : cat.id)}
                  className={`px-4 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive ? "" : "tools-stone-btn"
                  }`}
                  style={isActive ? { backgroundColor: `${cat.color}20`, color: cat.color, boxShadow: `0 0 12px ${cat.color}15` } : {}}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* New Category Form */}
          {showNewCategory && (
            <div className="tools-glass-card p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">New Category</h3>
                <button onClick={() => setShowNewCategory(false)} className="text-text-muted hover:text-text-secondary"><X size={16} /></button>
              </div>
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category name"
                autoFocus onKeyDown={(e) => e.key === "Enter" && addCategory()}
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#D4A04E] text-sm" />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-muted uppercase">Color:</span>
                  {CATEGORY_COLORS.map((c) => (
                    <button key={c} onClick={() => setNewCatColor(c)}
                      className={`w-5 h-5 rounded-full transition-all ${newCatColor === c ? "ring-2 ring-offset-1 ring-offset-bg-secondary scale-110" : "hover:scale-110"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-muted uppercase">Icon:</span>
                  {CATEGORY_ICONS.slice(0, 6).map((iconName) => {
                    const Icon = ICON_MAP[iconName];
                    return (
                      <button key={iconName} onClick={() => setNewCatIcon(iconName)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                          newCatIcon === iconName ? "bg-[#D4A04E]/20 text-[#D4A04E]" : "text-text-muted hover:text-text-secondary hover:bg-bg-hover"
                        }`}>
                        <Icon size={13} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <button onClick={addCategory} disabled={!newCatName.trim()}
                className="px-4 py-1.5 rounded-xl tools-stone-btn-active text-sm font-medium disabled:opacity-40 transition-colors">
                Create
              </button>
            </div>
          )}

          {/* Categories Grid (Terrazas) */}
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-48 rounded-2xl bg-bg-secondary border border-border animate-pulse" />)}
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="categories" type="CATEGORY" direction="vertical">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filtered.map((cat, catIdx) => {
                      const CatIcon = ICON_MAP[cat.icon] || Folder;

                      return (
                        <Draggable key={cat.id} draggableId={cat.id} index={catIdx}>
                          {(catProvided, catSnapshot) => (
                            <div
                              ref={catProvided.innerRef}
                              {...catProvided.draggableProps}
                              className={`tools-terraza rounded-2xl overflow-hidden transition-all ${catSnapshot.isDragging ? "shadow-lg scale-[1.02]" : ""}`}
                              style={{ ...catProvided.draggableProps.style, borderColor: `${cat.color}20` }}
                            >
                              {/* Category Header */}
                              <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: `${cat.color}12`, backgroundColor: `${cat.color}06` }}>
                                <span {...catProvided.dragHandleProps} className="text-text-muted/40 hover:text-text-muted cursor-grab active:cursor-grabbing">
                                  <GripVertical size={14} />
                                </span>
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cat.color}15` }}>
                                  <CatIcon size={13} className="flex-shrink-0" style={{ color: cat.color }} />
                                </div>
                                {editingCat === cat.id ? (
                                  <div className="flex items-center gap-1 flex-1">
                                    <input type="text" value={editCatName} onChange={(e) => setEditCatName(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === "Enter") renameCategory(cat.id); if (e.key === "Escape") setEditingCat(null); }}
                                      autoFocus className="flex-1 bg-transparent text-sm font-semibold focus:outline-none border-b border-border focus:border-[#D4A04E]" />
                                    <button onClick={() => renameCategory(cat.id)} className="text-success"><Check size={14} /></button>
                                    <button onClick={() => setEditingCat(null)} className="text-text-muted"><X size={14} /></button>
                                  </div>
                                ) : (
                                  <h3 className="flex-1 font-heading font-semibold text-[13px]" style={{ color: cat.color }}>{cat.name}</h3>
                                )}
                                <span className="text-[10px] text-text-muted">{cat.tools.length} tools</span>
                                <button onClick={() => { setEditingCat(cat.id); setEditCatName(cat.name); }}
                                  className="p-1 text-text-muted hover:text-text-secondary opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-bg-hover">
                                  <Pencil size={11} />
                                </button>
                                <button onClick={() => deleteCategory(cat.id)}
                                  className="p-1 text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-bg-hover">
                                  <Trash2 size={11} />
                                </button>
                              </div>

                              {/* Tools Grid */}
                              <Droppable droppableId={cat.id} type="TOOL">
                                {(toolProvided, toolSnapshot) => (
                                  <div
                                    ref={toolProvided.innerRef}
                                    {...toolProvided.droppableProps}
                                    className={`p-3 min-h-[80px] grid grid-cols-1 sm:grid-cols-2 gap-2 transition-colors ${
                                      toolSnapshot.isDraggingOver ? "bg-[#D4A04E]/5" : ""
                                    }`}
                                  >
                                    {cat.tools.map((tool: ToolItem, toolIdx: number) => (
                                      <Draggable key={tool.id} draggableId={tool.id} index={toolIdx}>
                                        {(tProvided, tSnapshot) => (
                                          <div
                                            ref={tProvided.innerRef}
                                            {...tProvided.draggableProps}
                                            className={`tools-card group/card rounded-xl p-3 transition-all ${tSnapshot.isDragging ? "shadow-lg" : ""}`}
                                            style={tProvided.draggableProps.style}
                                          >
                                            <div className="flex items-start gap-2.5">
                                              <span {...tProvided.dragHandleProps} className="mt-0.5 text-text-muted/30 hover:text-text-muted cursor-grab active:cursor-grabbing">
                                                <GripVertical size={12} />
                                              </span>
                                              {getFavicon(tool.url) ? (
                                                <img src={getFavicon(tool.url)!} alt="" className="w-5 h-5 rounded mt-0.5 flex-shrink-0" />
                                              ) : (
                                                <Globe size={16} className="text-text-muted mt-0.5 flex-shrink-0" />
                                              )}
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                  <a href={tool.url} target="_blank" rel="noopener noreferrer"
                                                    className="text-[12px] font-semibold text-text-primary hover:text-[#D4A04E] transition-colors truncate">
                                                    {tool.name}
                                                  </a>
                                                  <a href={tool.url} target="_blank" rel="noopener noreferrer"
                                                    className="text-text-muted hover:text-[#D4A04E] transition-colors flex-shrink-0">
                                                    <ExternalLink size={10} />
                                                  </a>
                                                </div>
                                                {tool.description && (
                                                  <p className="text-[10px] text-text-muted mt-0.5 leading-tight line-clamp-2">{tool.description}</p>
                                                )}
                                              </div>
                                              <button onClick={() => deleteTool(cat.id, tool.id)}
                                                className="opacity-0 group-hover/card:opacity-100 text-text-muted hover:text-danger transition-all p-0.5 flex-shrink-0">
                                                <X size={11} />
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {toolProvided.placeholder}
                                  </div>
                                )}
                              </Droppable>

                              {/* Add Tool */}
                              <div className="px-3 pb-3">
                                {addingToolTo === cat.id ? (
                                  <div className="tools-glass-card p-2.5 space-y-2 rounded-xl">
                                    <input type="text" value={newToolName} onChange={(e) => setNewToolName(e.target.value)} placeholder="Tool name"
                                      autoFocus className="w-full px-2 py-1 rounded-md bg-bg-tertiary border border-border text-text-primary text-[11px] placeholder:text-text-muted focus:outline-none focus:border-[#D4A04E]" />
                                    <input type="url" value={newToolUrl} onChange={(e) => setNewToolUrl(e.target.value)} placeholder="https://..."
                                      className="w-full px-2 py-1 rounded-md bg-bg-tertiary border border-border text-text-primary text-[11px] placeholder:text-text-muted focus:outline-none focus:border-[#D4A04E]" />
                                    <input type="text" value={newToolDesc} onChange={(e) => setNewToolDesc(e.target.value)} placeholder="Brief description (optional)"
                                      onKeyDown={(e) => e.key === "Enter" && addTool(cat.id)}
                                      className="w-full px-2 py-1 rounded-md bg-bg-tertiary border border-border text-text-primary text-[11px] placeholder:text-text-muted focus:outline-none focus:border-[#D4A04E]" />
                                    <div className="flex gap-1.5">
                                      <button onClick={() => addTool(cat.id)} disabled={!newToolName.trim() || !newToolUrl.trim()}
                                        className="px-3 py-1 rounded-lg text-[11px] font-medium tools-stone-btn-active disabled:opacity-40">Add</button>
                                      <button onClick={() => { setAddingToolTo(null); setNewToolName(""); setNewToolUrl(""); setNewToolDesc(""); }}
                                        className="px-3 py-1 rounded-lg text-[11px] text-text-muted hover:text-text-secondary">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <button onClick={() => setAddingToolTo(cat.id)}
                                    className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-[#D4A04E] transition-colors px-1 py-1">
                                    <Plus size={12} /> Add tool
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </main>
    </div>
  );
}
