"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, X, Check, Trash2, Link2, ExternalLink, MessageSquare,
  FolderKanban, MoreHorizontal, ChevronDown, ChevronUp, Calendar, Tags,
  CheckSquare, AlignLeft, Clock, GripVertical, Copy, ArrowRightLeft,
  Eye, Archive, Zap, RotateCcw,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Project, ProjectTask } from "@/lib/types";

const PROJECT_COLORS = [
  "#E8729A", "#E0548E", "#C589D9", "#9B7EC8", "#8B6CC1", "#A07BE5",
  "#7C9AE6", "#8CB4E8", "#6DB0D4", "#96B5B0", "#7CC4BC", "#8CCFAC",
  "#B5CC6A", "#C4D47A",
  "#6B9E5D", "#96B86B", "#E8E066", "#EDCA73", "#F0B86D", "#E8A064",
  "#E88B78", "#D97070", "#D49090", "#A08080",
];
const LABEL_COLORS = [
  { name: "Red", color: "#EF4444" }, { name: "Orange", color: "#F97316" },
  { name: "Yellow", color: "#EAB308" }, { name: "Green", color: "#22C55E" },
  { name: "Blue", color: "#3B82F6" }, { name: "Purple", color: "#8B5CF6" },
  { name: "Pink", color: "#EC4899" }, { name: "Teal", color: "#14B8A6" },
];

// ─── Task Detail Modal ─────────────────────────────────────────
function TaskDetailModal({
  task, project, projects, onClose, onUpdate, onDelete, onToggle,
  onAddComment, onAddLink, onRemoveLink, onAddChecklist, onToggleChecklist, onDeleteChecklist, onEditChecklist, onReorderChecklist, onMoveTask,
}: {
  task: ProjectTask; project: Project; projects: Project[];
  onClose: () => void;
  onUpdate: (updates: Record<string, unknown>) => void;
  onDelete: () => void; onToggle: () => void;
  onAddComment: (text: string) => void;
  onAddLink: (link: string) => void;
  onRemoveLink: (idx: number) => void;
  onAddChecklist: (text: string) => void;
  onToggleChecklist: (itemId: string) => void;
  onDeleteChecklist: (itemId: string) => void;
  onEditChecklist: (itemId: string, text: string) => void;
  onReorderChecklist: (reordered: { id: string; text: string; done: boolean }[]) => void;
  onMoveTask: (toProjectId: string, position: number) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description || "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [comment, setComment] = useState("");
  const [link, setLink] = useState("");
  const [checkText, setCheckText] = useState("");
  const [editingCheckId, setEditingCheckId] = useState<string | null>(null);
  const [editingCheckText, setEditingCheckText] = useState("");
  const [showLabels, setShowLabels] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [moveProject, setMoveProject] = useState(project._id!);
  const [movePosition, setMovePosition] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  const labels = task.labels || [];
  const checklist = task.checklist || [];
  const checkDone = checklist.filter((c) => c.done).length;

  const toggleLabel = (color: string) => {
    const updated = labels.includes(color) ? labels.filter((l) => l !== color) : [...labels, color];
    onUpdate({ labels: updated });
  };

  return (
    <div ref={overlayRef} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="w-full max-w-[768px] max-h-[85vh] overflow-y-auto bg-bg-secondary rounded-xl border border-border shadow-2xl animate-slide-in-right mx-4">
        <div className="px-5 pt-4 pb-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="relative mb-2">
              <button onClick={() => setShowMove(!showMove)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-text-inverse"
                style={{ backgroundColor: project.color }}>
                {project.name} <ChevronDown size={10} />
              </button>
              {showMove && (
                <div className="absolute top-8 left-0 bg-bg-tertiary border border-border rounded-lg p-3 shadow-xl z-10 w-64">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold">Move card</h4>
                    <button onClick={() => setShowMove(false)} className="text-text-muted"><X size={12} /></button>
                  </div>
                  <p className="text-[10px] text-text-muted mb-2">Select destination</p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold text-text-secondary">List</label>
                      <select value={moveProject} onChange={(e) => { setMoveProject(e.target.value); setMovePosition(0); }}
                        className="w-full mt-0.5 px-2 py-1.5 rounded bg-bg-secondary border border-border text-xs text-text-primary">
                        {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-text-secondary">Position</label>
                      <select value={movePosition} onChange={(e) => setMovePosition(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1.5 rounded bg-bg-secondary border border-border text-xs text-text-primary">
                        {Array.from({ length: (projects.find((p) => p._id === moveProject)?.tasks?.length || 0) + 1 }, (_, i) => (
                          <option key={i} value={i}>{i + 1}</option>
                        ))}
                      </select>
                    </div>
                    <button onClick={() => { onMoveTask(moveProject, movePosition); setShowMove(false); }}
                      className="w-full py-1.5 rounded bg-accent text-text-inverse text-xs font-medium hover:bg-accent-hover transition-colors">Move</button>
                  </div>
                </div>
              )}
            </div>
            {editingTitle ? (
              <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
                onBlur={() => { onUpdate({ title }); setEditingTitle(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") { onUpdate({ title }); setEditingTitle(false); } }}
                className="text-lg font-bold bg-transparent text-text-primary w-full focus:outline-none border-b border-accent pb-1" />
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={onToggle}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    task.done ? "bg-accent border-accent" : "border-text-muted hover:border-accent"
                  }`}>
                  {task.done && <Check size={10} className="text-text-inverse" />}
                </button>
                <h2 onClick={() => setEditingTitle(true)}
                  className={`text-lg font-bold cursor-text hover:bg-bg-hover rounded px-1 -mx-1 ${task.done ? "line-through text-text-muted" : "text-text-primary"}`}>
                  {task.title}
                </h2>
              </div>
            )}
            {labels.length > 0 && (
              <div className="flex gap-1 mt-2 ml-8">
                {labels.map((l) => <div key={l} className="w-8 h-2 rounded-full" style={{ backgroundColor: l }} />)}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1"><X size={18} /></button>
        </div>

        <div className="flex flex-col md:flex-row">
          <div className="flex-1 px-5 pb-5 space-y-4 min-w-0">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowLabels(!showLabels)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-tertiary hover:bg-bg-hover text-text-secondary text-xs font-medium border border-border transition-colors">
                <Tags size={13} /> Labels
              </button>
              <button onClick={() => setShowDates(!showDates)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-tertiary hover:bg-bg-hover text-text-secondary text-xs font-medium border border-border transition-colors">
                <Calendar size={13} /> Dates
              </button>
              <button onClick={() => document.getElementById("checklist-input")?.focus()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-tertiary hover:bg-bg-hover text-text-secondary text-xs font-medium border border-border transition-colors">
                <CheckSquare size={13} /> Checklist
              </button>
            </div>
            {showLabels && (
              <div className="p-3 bg-bg-tertiary rounded-lg border border-border space-y-1.5">
                <h4 className="text-[10px] text-text-muted uppercase tracking-wide">Labels</h4>
                {LABEL_COLORS.map((l) => (
                  <button key={l.color} onClick={() => toggleLabel(l.color)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-bg-hover transition-colors">
                    <div className="w-full h-7 rounded" style={{ backgroundColor: l.color, opacity: labels.includes(l.color) ? 1 : 0.4 }} />
                    {labels.includes(l.color) && <Check size={14} className="text-text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
            {showDates && (
              <div className="p-3 bg-bg-tertiary rounded-lg border border-border space-y-2">
                <h4 className="text-[10px] text-text-muted uppercase tracking-wide">Due date</h4>
                <input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); onUpdate({ dueDate: e.target.value }); }}
                  className="w-full px-2 py-1.5 rounded bg-bg-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlignLeft size={14} className="text-text-muted" />
                <h3 className="text-sm font-semibold text-text-primary">Description</h3>
              </div>
              {editingDesc ? (
                <div className="space-y-2">
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} autoFocus rows={5}
                    placeholder="Add a more detailed description..."
                    className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-y" />
                  <div className="flex gap-2">
                    <button onClick={() => { onUpdate({ description: desc }); setEditingDesc(false); }}
                      className="px-3 py-1.5 rounded bg-accent text-text-inverse text-xs font-medium hover:bg-accent-hover">Save</button>
                    <button onClick={() => { setDesc(task.description || ""); setEditingDesc(false); }}
                      className="px-3 py-1.5 rounded text-text-muted text-xs hover:text-text-secondary">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditingDesc(true)}
                  className="w-full text-left px-3 py-3 rounded-lg bg-bg-tertiary text-sm text-text-muted hover:bg-bg-hover transition-colors min-h-[60px] whitespace-pre-wrap">
                  {desc || "Add a more detailed description..."}
                </button>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare size={14} className="text-text-muted" />
                <h3 className="text-sm font-semibold text-text-primary">Checklist</h3>
                {checklist.length > 0 && <span className="text-[10px] text-text-muted">{checkDone}/{checklist.length}</span>}
              </div>
              {checklist.length > 0 && (
                <div className="w-full h-1.5 rounded-full bg-bg-tertiary mb-2 overflow-hidden">
                  <div className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${(checkDone / checklist.length) * 100}%` }} />
                </div>
              )}
              <DragDropContext onDragEnd={(result: DropResult) => {
                if (!result.destination || result.source.index === result.destination.index) return;
                const reordered = [...checklist];
                const [moved] = reordered.splice(result.source.index, 1);
                reordered.splice(result.destination.index, 0, moved);
                onReorderChecklist(reordered);
              }}>
                <Droppable droppableId="checklist-items">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1 mb-2">
                      {checklist.map((item, idx) => (
                        <Draggable key={item.id} draggableId={`check-${item.id}`} index={idx}>
                          {(dragProv, snapshot) => (
                            <div ref={dragProv.innerRef} {...dragProv.draggableProps}
                              className={`flex items-center gap-2 group px-1 py-0.5 rounded hover:bg-bg-hover ${snapshot.isDragging ? "bg-bg-hover shadow-md" : ""}`}>
                              <span {...dragProv.dragHandleProps} className="text-text-muted/30 hover:text-text-muted cursor-grab active:cursor-grabbing flex-shrink-0">
                                <GripVertical size={12} />
                              </span>
                              <button onClick={() => onToggleChecklist(item.id)}
                                className={`w-4 h-4 rounded border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors ${
                                  item.done ? "bg-accent border-accent" : "border-text-muted hover:border-accent"
                                }`}>
                                {item.done && <Check size={8} className="text-text-inverse" />}
                              </button>
                              {editingCheckId === item.id ? (
                                <input type="text" value={editingCheckText} onChange={(e) => setEditingCheckText(e.target.value)}
                                  onBlur={() => { if (editingCheckText.trim()) { onEditChecklist(item.id, editingCheckText.trim()); } setEditingCheckId(null); }}
                                  onKeyDown={(e) => { if (e.key === "Enter") { if (editingCheckText.trim()) { onEditChecklist(item.id, editingCheckText.trim()); } setEditingCheckId(null); } if (e.key === "Escape") setEditingCheckId(null); }}
                                  autoFocus className="flex-1 px-1 py-0.5 rounded bg-bg-tertiary border border-accent text-xs text-text-primary focus:outline-none" />
                              ) : (
                                <span onClick={() => { setEditingCheckId(item.id); setEditingCheckText(item.text); }}
                                  className={`flex-1 text-xs cursor-pointer ${item.done ? "line-through text-text-muted" : "text-text-primary hover:text-accent"}`}>{item.text}</span>
                              )}
                              <button onClick={() => onDeleteChecklist(item.id)}
                                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all"><X size={12} /></button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              <div className="flex items-center gap-2">
                <input id="checklist-input" type="text" value={checkText} onChange={(e) => setCheckText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && checkText.trim()) { onAddChecklist(checkText.trim()); setCheckText(""); } }}
                  placeholder="Add an item..."
                  className="flex-1 px-2 py-1.5 rounded bg-bg-tertiary border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
                {checkText && <button onClick={() => { onAddChecklist(checkText.trim()); setCheckText(""); }}
                  className="px-2 py-1.5 rounded bg-accent text-text-inverse text-xs font-medium">Add</button>}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link2 size={14} className="text-text-muted" />
                <h3 className="text-sm font-semibold text-text-primary">Links</h3>
              </div>
              <div className="space-y-1 mb-2">
                {(task.links || []).map((l, i) => (
                  <div key={i} className="flex items-center gap-2 group px-1 py-0.5 rounded hover:bg-bg-hover">
                    <Link2 size={11} className="text-accent flex-shrink-0" />
                    <a href={l} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline truncate flex-1">{l.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}</a>
                    <ExternalLink size={10} className="text-accent flex-shrink-0" />
                    <button onClick={() => onRemoveLink(i)}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all"><X size={12} /></button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="url" value={link} onChange={(e) => setLink(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && link.trim()) { onAddLink(link.trim()); setLink(""); } }}
                  placeholder="Add link..."
                  className="flex-1 px-2 py-1.5 rounded bg-bg-tertiary border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
              </div>
            </div>
          </div>
          <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-border px-4 pb-5 pt-3">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={14} className="text-text-muted" />
              <h3 className="text-sm font-semibold text-text-primary">Comments and activity</h3>
            </div>
            <div className="mb-3">
              <input type="text" value={comment} onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && comment.trim()) { onAddComment(comment.trim()); setComment(""); } }}
                placeholder="Write a comment..."
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
            </div>
            <div className="space-y-3">
              {(task.comments || []).slice().reverse().map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-accent">RC</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary">{c.text}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center flex-shrink-0 mt-0.5"><Clock size={10} className="text-text-muted" /></div>
                <div>
                  <p className="text-[11px] text-text-muted">Added to <span className="font-semibold text-text-secondary">{project.name}</span></p>
                  <p className="text-[10px] text-text-muted">{new Date(task.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                </div>
              </div>
              {task.completedAt && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5"><Check size={10} className="text-accent" /></div>
                  <div>
                    <p className="text-[11px] text-text-muted">Marked as <span className="font-semibold text-accent">complete</span></p>
                    <p className="text-[10px] text-text-muted">{new Date(task.completedAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                </div>
              )}
            </div>
            <button onClick={onDelete}
              className="mt-6 flex items-center gap-1.5 text-[11px] text-danger hover:bg-danger-subtle px-3 py-1.5 rounded transition-colors w-full">
              <Trash2 size={12} /> Delete card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── List Actions Menu (Trello-style) ───────────────────────────
function ListActionsMenu({
  project, projects, onClose, onArchive, onAddCard, onCopyList,
  onChangeColor, onMoveAllCards, onSortBy, onArchiveAllCards, onDeleteProject, anchorRect,
}: {
  project: Project; projects: Project[];
  onClose: () => void; onArchive: () => void; onAddCard: () => void;
  onCopyList: () => void;
  onChangeColor: (color: string) => void;
  onMoveAllCards: (toProjectId: string) => void;
  onSortBy: (sort: string) => void;
  onArchiveAllCards: () => void;
  onDeleteProject: () => void;
  anchorRect?: { top: number; left: number; width: number };
}) {
  const [showColors, setShowColors] = useState(false);
  const [showMoveAll, setShowMoveAll] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Position the menu near the anchor button
  useEffect(() => {
    if (ref.current && anchorRect) {
      const menu = ref.current;
      const menuRect = menu.getBoundingClientRect();
      let top = anchorRect.top;
      let left = anchorRect.left + anchorRect.width + 8;
      // If overflows right, put it to the left of the anchor
      if (left + menuRect.width > window.innerWidth - 16) {
        left = anchorRect.left - menuRect.width - 8;
      }
      // If overflows bottom, shift up
      if (top + menuRect.height > window.innerHeight - 16) {
        top = window.innerHeight - menuRect.height - 16;
      }
      if (top < 8) top = 8;
      if (left < 8) left = 8;
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
    }
  }, [anchorRect]);

  return (
    <div ref={ref} className="fixed w-72 bg-bg-tertiary border border-border rounded-lg shadow-2xl z-50 max-h-[80vh] overflow-y-auto"
      style={{ top: "auto", right: "auto" }}
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <h4 className="text-xs font-semibold text-text-primary">List actions</h4>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={14} /></button>
      </div>

      <div className="py-1">
        <button onClick={() => { onAddCard(); onClose(); }}
          className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-bg-hover transition-colors">Add card</button>
        <button onClick={() => { onCopyList(); onClose(); }}
          className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2">
          <Copy size={12} className="text-text-muted" /> Copy list
        </button>
        <button onClick={() => setShowMoveAll(!showMoveAll)}
          className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2">
          <ArrowRightLeft size={12} className="text-text-muted" /> Move all cards in this list
        </button>
        {showMoveAll && (
          <div className="px-3 pb-2 space-y-1">
            {projects.filter((p) => p._id !== project._id).map((p) => (
              <button key={p._id} onClick={() => { onMoveAllCards(p._id!); onClose(); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-text-secondary hover:bg-bg-hover">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setShowSort(!showSort)}
          className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-bg-hover transition-colors">Sort by...</button>
        {showSort && (
          <div className="px-3 pb-2 space-y-1">
            <button onClick={() => { onSortBy("name"); onClose(); }} className="w-full text-left px-2 py-1 rounded text-[11px] text-text-secondary hover:bg-bg-hover">Name (A-Z)</button>
            <button onClick={() => { onSortBy("created"); onClose(); }} className="w-full text-left px-2 py-1 rounded text-[11px] text-text-secondary hover:bg-bg-hover">Date created</button>
            <button onClick={() => { onSortBy("done"); onClose(); }} className="w-full text-left px-2 py-1 rounded text-[11px] text-text-secondary hover:bg-bg-hover">Done status</button>
          </div>
        )}
        <button className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2">
          <Eye size={12} className="text-text-muted" /> Watch
        </button>
      </div>

      <div className="border-t border-border py-1">
        <button onClick={() => setShowColors(!showColors)}
          className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-bg-hover transition-colors flex items-center justify-between">
          Change list color {showColors ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {showColors && (
          <div className="px-3 pb-2">
            <div className="flex flex-wrap gap-1.5">
              {PROJECT_COLORS.map((c) => (
                <button key={c} onClick={() => { onChangeColor(c); onClose(); }}
                  className={`w-7 h-7 rounded-full transition-all hover:scale-110 ${project.color === c ? "ring-2 ring-offset-1 ring-offset-bg-tertiary" : ""}`}
                  style={{ backgroundColor: c, ["--tw-ring-color" as string]: c }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border py-1">
        <button onClick={() => setShowAutomation(!showAutomation)}
          className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-bg-hover transition-colors flex items-center justify-between">
          <span className="flex items-center gap-2"><Zap size={12} className="text-text-muted" /> Automation</span>
          {showAutomation ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {showAutomation && (
          <div className="px-3 pb-2 space-y-1">
            <p className="text-[11px] text-text-secondary hover:bg-bg-hover px-2 py-1 rounded cursor-pointer">When a card is added to the list...</p>
            <p className="text-[11px] text-text-secondary hover:bg-bg-hover px-2 py-1 rounded cursor-pointer">Every day, sort list by...</p>
            <p className="text-[11px] text-text-secondary hover:bg-bg-hover px-2 py-1 rounded cursor-pointer">Every Monday, sort list by...</p>
            <p className="text-[11px] text-text-secondary hover:bg-bg-hover px-2 py-1 rounded cursor-pointer">Create a rule</p>
          </div>
        )}
      </div>

      <div className="border-t border-border py-1">
        <button onClick={() => { onArchive(); onClose(); }}
          className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2">
          <Archive size={12} className="text-text-muted" /> Archive this list
        </button>
        <button onClick={() => { onArchiveAllCards(); onClose(); }}
          className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2">
          <Archive size={12} className="text-text-muted" /> Archive all cards in this list
        </button>
      </div>

      <div className="border-t border-border py-1">
        <button onClick={() => { onDeleteProject(); onClose(); }}
          className="w-full text-left px-3 py-2 text-xs text-danger hover:bg-danger/10 transition-colors flex items-center gap-2">
          <Trash2 size={12} /> Delete project
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);
  const [newLabels, setNewLabels] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<{ task: ProjectTask; project: Project } | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({});
  const [hoverTask, setHoverTask] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number; width: number } | undefined>(undefined);
  const [editingProjectName, setEditingProjectName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/projects?archived=true"),
      ]);
      const activeData = await activeRes.json();
      const allData = await archivedRes.json();
      setProjects(Array.isArray(activeData) ? activeData : []);
      setArchivedProjects(Array.isArray(allData) ? allData.filter((p: Project) => p.archived) : []);
    } catch { setProjects([]); setArchivedProjects([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const createProject = async () => {
    if (!newName.trim()) return;
    await fetch("/api/projects", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), color: newColor, labels: newLabels }),
    });
    setNewName(""); setNewDesc(""); setNewColor(PROJECT_COLORS[0]); setNewLabels([]); setShowNewProject(false);
    fetchProjects();
  };

  const archiveProject = async (id: string) => {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    });
    fetchProjects();
  };

  const unarchiveProject = async (id: string) => {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unarchive" }),
    });
    fetchProjects();
  };

  const permanentDelete = async (id: string) => {
    // Only for truly deleting from archive
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    fetchProjects();
  };

  const copyList = async (id: string) => {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "copy_list" }),
    });
    fetchProjects();
  };

  const archiveAllCards = async (id: string) => {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive_all_cards" }),
    });
    fetchProjects();
  };

  const addTask = async (projectId: string) => {
    const title = newTaskTitle[projectId]?.trim();
    if (!title) return;
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_task", title }),
    });
    setNewTaskTitle((prev) => ({ ...prev, [projectId]: "" }));
    fetchProjects();
  };

  const toggleTask = async (projectId: string, taskId: string) => {
    // Optimistic: toggle + sort (completed to bottom)
    setProjects(prev => prev.map(p => {
      if (p._id !== projectId) return p;
      const toggled = p.tasks.map(t => t.id === taskId ? { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : undefined } : t);
      return { ...p, tasks: [...toggled.filter(t => !t.done), ...toggled.filter(t => t.done)] };
    }));
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_task", taskId }),
    });
    fetchProjects();
  };

  const deleteTask = async (projectId: string, taskId: string) => {
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_task", taskId }),
    });
    if (selectedTask?.task.id === taskId) setSelectedTask(null);
    fetchProjects();
  };

  const updateTask = async (projectId: string, taskId: string, updates: Record<string, unknown>) => {
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_task", taskId, ...updates }),
    });
    fetchProjects();
  };

  const addComment = async (projectId: string, taskId: string, text: string) => {
    await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_comment", taskId, text }) });
    fetchProjects();
  };
  const addLink = async (projectId: string, taskId: string, link: string) => {
    await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_link", taskId, link }) });
    fetchProjects();
  };
  const removeLink = async (projectId: string, taskId: string, idx: number) => {
    await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove_link", taskId, linkIndex: idx }) });
    fetchProjects();
  };
  const addChecklist = async (projectId: string, taskId: string, text: string) => {
    await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_checklist_item", taskId, text }) });
    fetchProjects();
  };
  const toggleChecklist = async (projectId: string, taskId: string, itemId: string) => {
    await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle_checklist_item", taskId, itemId }) });
    fetchProjects();
  };
  const deleteChecklist = async (projectId: string, taskId: string, itemId: string) => {
    await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_checklist_item", taskId, itemId }) });
    fetchProjects();
  };
  const editChecklist = async (projectId: string, taskId: string, itemId: string, text: string) => {
    await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "edit_checklist_item", taskId, itemId, text }) });
    fetchProjects();
  };
  const reorderChecklist = async (projectId: string, taskId: string, reordered: { id: string; text: string; done: boolean }[]) => {
    // Optimistic update
    setProjects(prev => prev.map(p => p._id === projectId ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, checklist: reordered } : t) } : p));
    await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reorder_checklist", taskId, checklist: reordered }) });
  };
  const moveTask = async (fromProjectId: string, taskId: string, toProjectId: string, position: number) => {
    await fetch(`/api/projects/${fromProjectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "move_task", taskId, toProjectId, position }) });
    setSelectedTask(null); fetchProjects();
  };

  const reorderProjects = async (newOrder: Project[]) => {
    setProjects(newOrder);
    await fetch("/api/projects", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", projectIds: newOrder.map((p) => p._id) }),
    });
  };

  const changeProjectColor = async (projectId: string, color: string) => {
    await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ color }) });
    fetchProjects();
  };

  const renameProject = async (projectId: string, name: string) => {
    if (!name.trim()) return;
    await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    setEditingProjectName(null);
    fetchProjects();
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project and all its tasks? This cannot be undone.")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setOpenMenu(null);
    fetchProjects();
  };

  const moveAllCards = async (fromProjectId: string, toProjectId: string) => {
    const from = projects.find((p) => p._id === fromProjectId);
    if (!from || !from.tasks.length) return;
    for (const task of from.tasks) {
      await fetch(`/api/projects/${fromProjectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "move_task", taskId: task.id, toProjectId, position: -1 }) });
    }
    fetchProjects();
  };

  const sortProjectTasks = async (projectId: string, sortBy: string) => {
    const project = projects.find((p) => p._id === projectId);
    if (!project) return;
    const sorted = [...project.tasks];
    if (sortBy === "name") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === "created") sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (sortBy === "done") sorted.sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
    setProjects((prev) => prev.map((p) => p._id === projectId ? { ...p, tasks: sorted } : p));
    await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reorder_tasks", tasks: sorted }) });
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (type === "COLUMN") {
      const newProjects = [...projects];
      const [moved] = newProjects.splice(source.index, 1);
      newProjects.splice(destination.index, 0, moved);
      reorderProjects(newProjects);
      return;
    }
    if (type === "CARD") {
      const fromProjectId = source.droppableId;
      const toProjectId = destination.droppableId;
      const fromProject = projects.find((p) => p._id === fromProjectId);
      if (!fromProject) return;
      const task = fromProject.tasks[source.index];
      if (!task) return;
      if (fromProjectId === toProjectId) {
        const newTasks = [...fromProject.tasks];
        newTasks.splice(source.index, 1);
        newTasks.splice(destination.index, 0, task);
        setProjects((prev) => prev.map((p) => p._id === fromProjectId ? { ...p, tasks: newTasks } : p));
        await fetch(`/api/projects/${fromProjectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reorder_tasks", tasks: newTasks }) });
      } else {
        await moveTask(fromProjectId, task.id, toProjectId, destination.index);
      }
    }
  };

  const getProgress = (tasks: ProjectTask[]) => {
    if (!tasks || tasks.length === 0) return 0;
    return Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar hideAdd
          leftContent={
            <div className="flex items-center gap-2">
              {archivedProjects.length > 0 && (
                <button onClick={() => setShowArchive(!showArchive)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-secondary border border-border text-text-muted text-[12px] font-medium hover:text-text-secondary transition-colors">
                  <Archive size={14} /> Archived ({archivedProjects.length})
                </button>
              )}
              <button onClick={() => setShowNewProject(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-text-inverse text-[12px] font-medium transition-colors">
                <Plus size={14} /> New Project
              </button>
            </div>
          }
        />
        <div className="p-4 md:p-6 pb-24 md:pb-6">
          <div className="flex items-center gap-2 mb-4">
            <FolderKanban size={20} className="text-accent" />
            <h1 className="font-heading font-semibold text-lg">Projects</h1>
          </div>

          {/* Archived Projects */}
          {showArchive && archivedProjects.length > 0 && (
            <div className="mb-4 rounded-lg bg-bg-secondary border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Archive size={14} /> Archived Projects</h3>
                <button onClick={() => setShowArchive(false)} className="text-text-muted hover:text-text-secondary"><X size={14} /></button>
              </div>
              <div className="space-y-2">
                {archivedProjects.map((p) => (
                  <div key={p._id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg-tertiary border border-border">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="flex-1 text-sm text-text-primary">{p.name}</span>
                    <span className="text-[10px] text-text-muted">{(p.tasks || []).length} cards</span>
                    <button onClick={() => unarchiveProject(p._id!)}
                      className="flex items-center gap-1 text-[11px] text-accent hover:bg-accent-subtle px-2 py-1 rounded transition-colors">
                      <RotateCcw size={11} /> Restore
                    </button>
                    <button onClick={() => { if (confirm(`Permanently delete "${p.name}"? This cannot be undone.`)) permanentDelete(p._id!); }}
                      className="flex items-center gap-1 text-[11px] text-danger hover:bg-danger-subtle px-2 py-1 rounded transition-colors">
                      <Trash2 size={11} /> Delete forever
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Project Form */}
          {showNewProject && (
            <div className="rounded-lg bg-bg-secondary border border-border p-4 space-y-3 mb-4 max-w-md">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">New Project</h3>
                <button onClick={() => setShowNewProject(false)} className="text-text-muted hover:text-text-secondary"><X size={16} /></button>
              </div>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Project name"
                autoFocus onKeyDown={(e) => e.key === "Enter" && createProject()}
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent text-sm" />
              <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)"
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent text-sm" />
              <div>
                <span className="text-[11px] text-text-muted mb-1 block">Color:</span>
                <div className="flex flex-wrap gap-2 max-w-[320px]">
                  {PROJECT_COLORS.map((c) => (
                    <button key={c} onClick={() => setNewColor(c)}
                      className={`w-6 h-6 rounded-full transition-all ${newColor === c ? "ring-2 ring-offset-2 ring-offset-bg-secondary scale-110" : "hover:scale-110"}`}
                      style={{ backgroundColor: c, ["--tw-ring-color" as string]: c }} />
                  ))}
                </div>
              </div>
              <button onClick={createProject} disabled={!newName.trim()}
                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-text-inverse text-sm font-medium disabled:opacity-40 transition-colors">
                Create Project
              </button>
            </div>
          )}

          {/* Projects Board */}
          {loading ? (
            <div className="flex gap-4">{[1, 2, 3].map((i) => <div key={i} className="w-64 h-48 rounded-lg bg-bg-secondary border border-border animate-pulse flex-shrink-0" />)}</div>
          ) : projects.length === 0 && !showNewProject ? (
            <div className="text-center py-16 rounded-lg bg-bg-secondary border border-border">
              <FolderKanban size={40} className="mx-auto text-text-muted mb-3" />
              <p className="text-text-muted text-sm">No projects yet</p>
              <button onClick={() => setShowNewProject(true)} className="mt-3 text-accent text-sm font-medium hover:underline">Create your first project</button>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="board" type="COLUMN" direction="horizontal">
                {(boardProvided) => (
                  <div ref={boardProvided.innerRef} {...boardProvided.droppableProps}
                    className="flex gap-3 overflow-x-auto pb-4 items-start" style={{ scrollbarWidth: "thin" }}>
                    {projects.map((project, projectIdx) => {
                      const progress = getProgress(project.tasks || []);
                      const totalTasks = (project.tasks || []).length;
                      const doneTasks = (project.tasks || []).filter((t) => t.done).length;
                      const projectLabels = project.labels || [];

                      return (
                        <Draggable key={project._id} draggableId={`project-${project._id}`} index={projectIdx}>
                          {(colProvided, colSnapshot) => (
                            <div ref={colProvided.innerRef} {...colProvided.draggableProps}
                              className={`w-64 flex-shrink-0 rounded-lg bg-bg-secondary border border-border overflow-visible flex flex-col transition-shadow ${colSnapshot.isDragging ? "shadow-2xl opacity-95 rotate-1" : ""}`}>
                              {/* Project Header — drag handle */}
                              <div {...colProvided.dragHandleProps} className="px-3 py-2.5 border-b cursor-grab active:cursor-grabbing" style={{ borderBottomColor: `${project.color}30` }}>
                                <div className="flex items-center gap-2 mb-1 relative">
                                  {/* Multi-color labels or single dot */}
                                  {projectLabels.length > 0 ? (
                                    <div className="flex gap-0.5 flex-shrink-0">
                                      {projectLabels.map((l) => <div key={l} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l }} />)}
                                    </div>
                                  ) : (
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                                  )}
                                  {editingProjectName === project._id ? (
                                    <input
                                      value={editNameValue}
                                      onChange={(e) => setEditNameValue(e.target.value)}
                                      onBlur={() => renameProject(project._id!, editNameValue)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") renameProject(project._id!, editNameValue);
                                        if (e.key === "Escape") setEditingProjectName(null);
                                      }}
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      className="font-heading font-bold text-sm uppercase tracking-wide flex-1 min-w-0 bg-bg-tertiary border border-accent rounded px-1.5 py-0.5 text-text-primary focus:outline-none"
                                    />
                                  ) : (
                                    <h3
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingProjectName(project._id!);
                                        setEditNameValue(project.name);
                                      }}
                                      className="font-heading font-bold text-sm uppercase tracking-wide flex-1 truncate cursor-text hover:bg-bg-tertiary hover:rounded px-1 -mx-1 transition-colors"
                                    >
                                      {project.name}
                                    </h3>
                                  )}
                                  <span className="text-[11px] text-text-muted">{doneTasks}/{totalTasks}</span>
                                  <button onClick={(e) => {
                                      e.stopPropagation();
                                      if (openMenu === project._id) { setOpenMenu(null); setMenuAnchor(undefined); }
                                      else {
                                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                        setMenuAnchor({ top: rect.top, left: rect.left, width: rect.width });
                                        setOpenMenu(project._id!);
                                      }
                                    }}
                                    className="text-text-muted hover:text-text-primary transition-colors p-0.5">
                                    <MoreHorizontal size={14} />
                                  </button>
                                </div>
                                {project.description && <p className="text-[10px] text-text-muted truncate mb-1">{project.description}</p>}
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: progress === 100 ? "#10B981" : project.color }} />
                                  </div>
                                  <span className="text-[10px] font-mono font-semibold" style={{ color: progress === 100 ? "#10B981" : project.color }}>{progress}%</span>
                                </div>
                              </div>

                              {/* Tasks */}
                              <Droppable droppableId={project._id!} type="CARD">
                                {(provided, snapshot) => (
                                  <div ref={provided.innerRef} {...provided.droppableProps}
                                    className={`flex-1 p-2 space-y-1 min-h-[40px] overflow-y-auto max-h-[60vh] transition-colors ${snapshot.isDraggingOver ? "bg-bg-hover" : ""}`}>
                                    {(project.tasks || []).map((task, idx) => (
                                      <Draggable key={task.id} draggableId={task.id} index={idx}>
                                        {(provided, snapshot) => (
                                          <div ref={provided.innerRef} {...provided.draggableProps}
                                            onMouseEnter={() => setHoverTask(task.id)}
                                            onMouseLeave={() => setHoverTask(null)}
                                            className={`rounded-md border border-border bg-bg-primary hover:bg-bg-hover transition-all cursor-pointer ${snapshot.isDragging ? "shadow-lg border-accent/30" : ""}`}>
                                            {(task.labels || []).length > 0 && (
                                              <div className="flex gap-1 px-2.5 pt-2">
                                                {task.labels!.map((l) => <div key={l} className="w-8 h-1.5 rounded-full" style={{ backgroundColor: l }} />)}
                                              </div>
                                            )}
                                            <div className="flex items-center gap-2 px-2.5 py-2">
                                              <span {...provided.dragHandleProps} className="text-text-muted/30 hover:text-text-muted cursor-grab active:cursor-grabbing flex-shrink-0">
                                                <GripVertical size={12} />
                                              </span>
                                              {(hoverTask === task.id || task.done) ? (
                                                <button onClick={(e) => { e.stopPropagation(); toggleTask(project._id!, task.id); }}
                                                  className={`w-4 h-4 rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors ${task.done ? "bg-accent border-accent" : "border-text-muted hover:border-accent"}`}>
                                                  {task.done && <Check size={8} className="text-text-inverse" />}
                                                </button>
                                              ) : <div className="w-4 flex-shrink-0" />}
                                              <button onClick={() => setSelectedTask({ task, project })}
                                                className={`flex-1 text-left text-[12px] ${task.done ? "line-through text-text-muted" : "text-text-primary"}`}>
                                                {task.title}
                                              </button>
                                              <div className="flex items-center gap-1 flex-shrink-0">
                                                {(task.links || []).length > 0 && <Link2 size={10} className="text-accent" />}
                                                {(task.comments || []).length > 0 && (
                                                  <span className="flex items-center gap-0.5 text-text-muted text-[9px]"><MessageSquare size={9} /> {task.comments.length}</span>
                                                )}
                                                {(task.checklist || []).length > 0 && (
                                                  <span className={`flex items-center gap-0.5 text-[9px] ${(task.checklist || []).every((c) => c.done) ? "text-accent" : "text-text-muted"}`}>
                                                    <CheckSquare size={9} /> {(task.checklist || []).filter((c) => c.done).length}/{(task.checklist || []).length}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>

                              {/* Add card */}
                              <div className="px-2 pb-2 pt-1 border-t border-border">
                                <div className="flex items-center gap-2">
                                  <Plus size={14} className="text-text-muted flex-shrink-0" />
                                  <input type="text" data-project={project._id}
                                    value={newTaskTitle[project._id!] || ""}
                                    onChange={(e) => setNewTaskTitle((p) => ({ ...p, [project._id!]: e.target.value }))}
                                    onKeyDown={(e) => e.key === "Enter" && addTask(project._id!)}
                                    placeholder="Add a card"
                                    className="flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none py-1.5" />
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {boardProvided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </main>

      {/* List Actions Menu (rendered outside board for proper positioning) */}
      {openMenu && (() => {
        const menuProject = projects.find((p) => p._id === openMenu);
        if (!menuProject) return null;
        return (
          <ListActionsMenu
            project={menuProject} projects={projects}
            anchorRect={menuAnchor}
            onClose={() => { setOpenMenu(null); setMenuAnchor(undefined); }}
            onArchive={() => archiveProject(menuProject._id!)}
            onAddCard={() => document.querySelector<HTMLInputElement>(`input[data-project="${menuProject._id}"]`)?.focus()}
            onCopyList={() => copyList(menuProject._id!)}
            onChangeColor={(color) => changeProjectColor(menuProject._id!, color)}
            onMoveAllCards={(toId) => moveAllCards(menuProject._id!, toId)}
            onSortBy={(sort) => sortProjectTasks(menuProject._id!, sort)}
            onArchiveAllCards={() => archiveAllCards(menuProject._id!)}
            onDeleteProject={() => deleteProject(menuProject._id!)}
          />
        );
      })()}

      {/* Task Detail Modal */}
      {selectedTask && (() => {
        const freshProject = projects.find((p) => p._id === selectedTask.project._id);
        const freshTask = freshProject?.tasks.find((t) => t.id === selectedTask.task.id);
        if (!freshProject || !freshTask) return null;
        return (
          <TaskDetailModal
            task={freshTask} project={freshProject} projects={projects}
            onClose={() => setSelectedTask(null)}
            onUpdate={(updates) => updateTask(freshProject._id!, freshTask.id, updates)}
            onDelete={() => deleteTask(freshProject._id!, freshTask.id)}
            onToggle={() => toggleTask(freshProject._id!, freshTask.id)}
            onAddComment={(text) => addComment(freshProject._id!, freshTask.id, text)}
            onAddLink={(link) => addLink(freshProject._id!, freshTask.id, link)}
            onRemoveLink={(idx) => removeLink(freshProject._id!, freshTask.id, idx)}
            onAddChecklist={(text) => addChecklist(freshProject._id!, freshTask.id, text)}
            onToggleChecklist={(itemId) => toggleChecklist(freshProject._id!, freshTask.id, itemId)}
            onDeleteChecklist={(itemId) => deleteChecklist(freshProject._id!, freshTask.id, itemId)}
            onEditChecklist={(itemId, text) => editChecklist(freshProject._id!, freshTask.id, itemId, text)}
            onReorderChecklist={(reordered) => reorderChecklist(freshProject._id!, freshTask.id, reordered)}
            onMoveTask={(toId, pos) => moveTask(freshProject._id!, freshTask.id, toId, pos)}
          />
        );
      })()}
    </div>
  );
}
