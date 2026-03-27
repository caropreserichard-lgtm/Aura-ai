"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Check, Calendar, SlidersHorizontal,
  ArrowUpDown, Hash, Clock, Target, ArrowUp, Link2, X, Search, Undo2,
} from "lucide-react";
import {
  DndContext, rectIntersection, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay,
  PointerSensor, TouchSensor, useSensor, useSensors, useDroppable,
  CollisionDetection,
} from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import AddTaskModal from "@/components/AddTaskModal";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import { Task, CATEGORIES, Category } from "@/lib/types";
import { useTimerStore } from "@/lib/timerStore";

const CAT_COLORS: Record<string, string> = {
  trabajo: "#e7ca79",
  aprendizaje: "#8b7ec8",
  lifestyle: "#4a9e7e",
  proyectos: "#6b8aaf",
};

const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TIME_PRESETS = [
  { label: "5m", mins: 5 }, { label: "10m", mins: 10 }, { label: "15m", mins: 15 },
  { label: "20m", mins: 20 }, { label: "25m", mins: 25 }, { label: "30m", mins: 30 },
  { label: "35m", mins: 35 }, { label: "40m", mins: 40 }, { label: "45m", mins: 45 },
  { label: "1h", mins: 60 }, { label: "2h", mins: 120 },
];

function getWeekDates(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isToday(d: Date) { return isSameDay(d, new Date()); }
function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatMins(m: number) { return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}` : `0:${String(m).padStart(2, "0")}`; }

// ─── Filter Popover ─────────────────────────────────────────────
function FilterPopover({ selected, onSelect, onClose }: {
  selected: string; onSelect: (cat: string) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const cats = [
    { key: "all", label: "all", color: "#888" },
    ...Object.entries(CATEGORIES).map(([k, v]) => ({ key: k, label: v.label.toLowerCase(), color: v.color })),
  ].filter((c) => c.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="absolute top-full left-0 mt-2 w-64 bg-bg-tertiary border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-in-right">
      <div className="px-3 pt-3 pb-2">
        <p className="text-[11px] text-text-muted mb-2">Filter tasks by channel:</p>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-bg-secondary border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
        </div>
      </div>
      <div className="px-1 pb-1 max-h-52 overflow-y-auto">
        {cats.map((c) => (
          <button key={c.key} onClick={() => { onSelect(c.key); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${selected === c.key ? "bg-bg-hover" : "hover:bg-bg-hover/60"}`}>
            <Hash size={14} style={{ color: c.color }} />
            <span className="flex-1 text-text-primary">{c.label}</span>
            {selected === c.key && <Check size={14} className="text-accent" />}
          </button>
        ))}
      </div>
      <div className="border-t border-border px-3 py-2">
        <a href="/settings" className="text-xs text-accent hover:underline">Manage channels</a>
      </div>
    </div>
  );
}

// ─── Calendar Popover ─────────────────────────────────────────
function CalendarPopover({ current, onSelect, onClose }: {
  current: Date; onSelect: (d: Date) => void; onClose: () => void;
}) {
  const [viewMonth, setViewMonth] = useState(new Date(current.getFullYear(), current.getMonth(), 1));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday start

  return (
    <div ref={ref} className="absolute top-full left-0 mt-2 w-64 bg-bg-tertiary border border-border rounded-xl shadow-2xl z-50 p-3 animate-slide-in-right">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-bg-hover text-text-muted"><ChevronLeft size={14} /></button>
        <span className="text-xs font-semibold text-text-primary">{viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-bg-hover text-text-muted"><ChevronRight size={14} /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span key={d} className="text-[9px] font-semibold text-text-muted py-1">{d}</span>
        ))}
        {Array.from({ length: offset }, (_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = new Date(year, month, i + 1);
          const today = isToday(d);
          const sel = isSameDay(d, current);
          return (
            <button key={i} onClick={() => { onSelect(d); onClose(); }}
              className={`w-7 h-7 rounded-full text-[11px] transition-colors ${sel ? "bg-accent text-text-inverse font-bold" : today ? "ring-1 ring-accent text-accent font-semibold" : "text-text-secondary hover:bg-bg-hover"}`}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add Task Popup (centered modal) ──────────────────────────
function AddTaskPopup({ dateKey, onAdd, onClose, categories }: {
  dateKey: string; onAdd: (data: Record<string, unknown>) => void; onClose: () => void; categories: typeof CATEGORIES;
}) {
  const [title, setTitle] = useState("");
  const [showTime, setShowTime] = useState(false);
  const [showChannel, setShowChannel] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dateKey);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [category, setCategory] = useState<string>("trabajo");
  const [subcategory, setSubcategory] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (timeRef.current && !timeRef.current.contains(e.target as Node)) setShowTime(false);
      if (channelRef.current && !channelRef.current.contains(e.target as Node)) setShowChannel(false);
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setShowDatePicker(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", esc); };
  }, [onClose]);

  const submit = () => {
    if (!title.trim()) return;
    const cat = category as Category;
    const sub = subcategory || categories[cat]?.subcategories[0] || "";
    onAdd({
      title: title.trim(), category: cat, subcategory: sub,
      priority: 3, roi: 5, joy: 5, dueDate: selectedDate,
      ...(estimatedTime > 0 ? { estimatedTime } : {}),
    });
    setTitle(""); setEstimatedTime(0); setCategory("trabajo"); setSubcategory(""); onClose();
  };

  const getDateLabel = (dk: string) => {
    const d = new Date(dk + "T00:00:00");
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const dateInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* Invisible click-catcher */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      {/* Wide rectangular popup — absolutely positioned below Add task row */}
      <div ref={overlayRef} className="absolute left-1/2 -translate-x-1/2 w-[50%] top-[105px] z-50 bg-[#2a2a2e] rounded-xl border border-border/40 shadow-2xl overflow-visible">
        {/* Input area */}
        <div className="px-3.5 pt-3 pb-1.5">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
            placeholder="Task description..."
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none" />
        </div>
        {/* Bottom bar — horizontal row */}
        <div className="px-3.5 pb-3 flex items-center gap-1.5">
          <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-medium whitespace-nowrap">
            <span className="text-[9px] font-bold">TIP</span> Paste a URL
          </span>
          <div className="relative" ref={dateRef}>
            <button onClick={() => dateInputRef.current?.showPicker()}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-border/60 hover:bg-bg-hover text-[10px] text-text-muted transition-colors whitespace-nowrap">
              <Calendar size={11} /> {getDateLabel(selectedDate)}
            </button>
            <input ref={dateInputRef} type="date" value={selectedDate}
              onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
              className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none" />
          </div>
          <div className="relative" ref={timeRef}>
            <button onClick={() => setShowTime(!showTime)}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-border/60 hover:bg-bg-hover text-[10px] text-text-muted transition-colors whitespace-nowrap">
              <Clock size={11} /> {estimatedTime > 0 ? formatMins(estimatedTime) : "--:--"}
            </button>
            {showTime && (
              <div className="absolute bottom-full left-0 mb-2 w-52 bg-bg-tertiary border border-border rounded-xl shadow-2xl z-[60] p-2.5">
                <input type="text" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} placeholder="e.g. 25 or 1:30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && timeInput.trim()) {
                      const parts = timeInput.split(":");
                      const mins = parts.length === 2 ? parseInt(parts[0]) * 60 + parseInt(parts[1]) : parseInt(timeInput);
                      if (!isNaN(mins) && mins > 0) { setEstimatedTime(mins); setShowTime(false); setTimeInput(""); }
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-bg-secondary border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent mb-2" />
                <div className="grid grid-cols-4 gap-1.5">
                  {TIME_PRESETS.map((p) => (
                    <button key={p.label} onClick={() => { setEstimatedTime(p.mins); setShowTime(false); }}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${estimatedTime === p.mins ? "bg-accent text-text-inverse" : "bg-bg-secondary text-text-secondary hover:bg-bg-hover"}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative" ref={channelRef}>
            <button onClick={() => setShowChannel(!showChannel)}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-border/60 hover:bg-bg-hover text-[10px] text-text-muted transition-colors whitespace-nowrap">
              <Hash size={11} /> channel
            </button>
            {showChannel && (
              <div className="absolute bottom-full left-0 mb-2 w-60 bg-bg-tertiary border border-border rounded-xl shadow-2xl z-[60] p-2 max-h-56 overflow-y-auto">
                {Object.entries(categories).map(([cat, conf]) => (
                  <div key={cat} className="mb-1">
                    <p className="text-[9px] font-semibold uppercase tracking-wide px-2 py-1" style={{ color: conf.color }}>{conf.label}</p>
                    {conf.subcategories.map((sub) => (
                      <button key={sub} onClick={() => { setCategory(cat); setSubcategory(sub); setShowChannel(false); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${subcategory === sub ? "bg-bg-hover text-text-primary" : "text-text-secondary hover:bg-bg-hover"}`}>
                        # {sub}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={submit} disabled={!title.trim()}
            className="ml-auto p-2 rounded-md bg-accent hover:bg-accent-hover text-text-inverse transition-colors disabled:opacity-30" title="Add task">
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Sort Menu ────────────────────────────────────────────────
function SortMenu({ onSort, onClose }: { onSort: (by: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full right-0 mt-1 w-36 bg-bg-tertiary border border-border rounded-lg shadow-2xl z-50 overflow-hidden animate-slide-in-right">
      <div className="px-2 py-1.5 border-b border-border">
        <p className="text-[9px] text-text-muted">Reorder tasks by:</p>
      </div>
      <div className="py-0.5">
        {[
          { key: "name", label: "Name A-Z", icon: "A-Z" },
          { key: "created", label: "Date created", icon: "📅" },
          { key: "done", label: "Done status", icon: "✓" },
        ].map((opt) => (
          <button key={opt.key} onClick={() => { onSort(opt.key); onClose(); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-text-primary hover:bg-bg-hover transition-colors">
            <span className="w-4 text-center text-text-muted text-[10px]">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Droppable Day Column ─────────────────────────────────────
function DayColumn({ id, isHighlighted, children }: { id: string; isHighlighted: boolean; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl p-2 min-h-[280px] transition-all duration-200 ease-in-out ${
        isHighlighted
          ? "bg-[#19395c]/10 ring-2 ring-[#19395c]/40 shadow-[0_0_15px_rgba(25,57,92,0.15)]"
          : "bg-transparent"
      }`}
    >
      {children}
    </div>
  );
}

// ─── Draggable Task Card ──────────────────────────────────────
function TaskCard({ task, onSelect, onComplete, isDragging }: {
  task: Task; onSelect: (t: Task) => void; onComplete: (id: string) => void; isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task._id! });
  const color = CAT_COLORS[task.category] || "#666";
  const isDone = task.status === "done";
  const est = (task as unknown as Record<string, unknown>).estimatedTime as number | undefined;
  const spent = task.timeSpent || 0;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`rounded-xl border transition-all cursor-grab active:cursor-grabbing overflow-hidden bg-bg-secondary border-border hover:border-border/80 shadow-sm hover:shadow-md`}>
      <div className="px-2.5 pt-2 pb-1.5 cursor-pointer" onClick={() => onSelect(task)}>
        {!!(task.startDate || est) && (
          <div className="flex items-center justify-between mb-0.5">
            {task.startDate && (
              <span className="text-[9px] text-text-muted">
                {new Date(task.startDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()}
              </span>
            )}
            {(est || spent > 0) && (
              <span className="text-[8px] font-mono text-text-muted bg-bg-tertiary px-1 py-0.5 rounded ml-auto">
                {formatMins(spent)}{est ? ` / ${formatMins(est)}` : ""}
              </span>
            )}
          </div>
        )}
        <p className={`text-[11px] font-semibold leading-snug mb-1 ${isDone ? "line-through text-text-muted" : "text-text-primary"}`}
          style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {task.title}
        </p>
        {(task.subtasks || []).length > 0 && (
          <div className="space-y-0.5 mb-1">
            {task.subtasks!.map((sub, si) => (
              <div key={si} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center ${
                  sub.done ? "bg-emerald-500 border-emerald-500" : "border-text-muted/30"
                }`}>
                  {sub.done && <Check size={6} className="text-white" strokeWidth={3} />}
                </div>
                <span className={`text-[9px] truncate ${sub.done ? "line-through text-text-muted" : "text-text-secondary"}`}>{sub.text}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); onComplete(task._id!); }}
              className={`w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
                isDone ? "bg-emerald-500 border-[1.5px] border-emerald-500" : "border-[1.5px] border-text-muted/30 hover:border-accent"
              }`}>
              {isDone && <Check size={7} className="text-white" strokeWidth={3} />}
            </button>
            {task.dueDate && !task.startDate && <Calendar size={8} className="text-text-muted/40" />}
            {est && !task.startDate && <Clock size={8} className="text-text-muted/40" />}
          </div>
          <span className="text-[8px] font-medium truncate max-w-[60%] text-right" style={{ color }}>
            # {task.subcategory.length > 14 ? task.subcategory.slice(0, 14) + "..." : task.subcategory}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalDate, setAddModalDate] = useState<string | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterCat, setFilterCat] = useState("all");
  const [showFilter, setShowFilter] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [sortMenuDay, setSortMenuDay] = useState<string | null>(null);
  const [addTaskDay, setAddTaskDay] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<{ taskId: string; prevDueDate: string; label: string } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } catch (error) { console.error("Error:", error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const weekDates = getWeekDates(weekOffset);

  // Tasks by day (with filter)
  const tasksByDay: Record<string, Task[]> = {};
  weekDates.forEach((d) => {
    const key = toDateKey(d);
    let dayTasks = tasks.filter((t) => t.dueDate && t.dueDate.startsWith(key));
    if (filterCat !== "all") dayTasks = dayTasks.filter((t) => t.category === filterCat);
    dayTasks.sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (a.status !== "done" && b.status === "done") return -1;
      return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
    });
    tasksByDay[key] = dayTasks;
  });

  const handleComplete = async (id: string) => {
    const task = tasks.find((t) => t._id === id);
    const newStatus = task?.status === "done" ? "pending" : "done";
    setTasks((prev) => prev.map((t) => t._id === id ? { ...t, status: newStatus, completedAt: newStatus === "done" ? new Date().toISOString() : undefined } : t));
    try {
      await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      fetchTasks();
    } catch (e) { console.error(e); fetchTasks(); }
  };

  const handleAddTask = async (taskData: Record<string, unknown>) => {
    try {
      await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(taskData) });
      fetchTasks();
    } catch (e) { console.error(e); }
  };

  const handleInlineAdd = async (data: Record<string, unknown>) => {
    try {
      await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      fetchTasks();
    } catch (e) { console.error(e); }
  };

  const handleUpdateDueDate = async (taskId: string, newDueDate: string | null) => {
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, dueDate: newDueDate || undefined } : t)));
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dueDate: newDueDate }) });
    } catch (e) { console.error(e); fetchTasks(); }
  };

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // Custom collision detection: prioritize droppable day columns over sortable items
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    // First check for collisions with droppable containers (day columns)
    const rectCollisions = rectIntersection(args);

    // Find collisions that are date-key droppable containers
    const containerCollisions = rectCollisions.filter(
      (collision) => /^\d{4}-\d{2}-\d{2}$/.test(collision.id as string)
    );

    // If we have sortable item collisions, prefer those for within-column reordering
    const itemCollisions = rectCollisions.filter(
      (collision) => !/^\d{4}-\d{2}-\d{2}$/.test(collision.id as string)
    );

    // If there are item collisions, return them (enables reorder within column)
    if (itemCollisions.length > 0) {
      return itemCollisions;
    }

    // Otherwise return container collisions (enables dropping on empty columns)
    if (containerCollisions.length > 0) {
      return containerCollisions;
    }

    return rectCollisions;
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverColumnId(null); return; }
    const overId = over.id as string;
    // If over a date key directly (droppable container)
    if (/^\d{4}-\d{2}-\d{2}$/.test(overId)) {
      setOverColumnId(overId);
    } else {
      // Over a task — find which column it belongs to
      const task = tasks.find(t => t._id === overId);
      if (task?.dueDate) setOverColumnId(task.dueDate.split("T")[0]);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    setOverColumnId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Resolve target date key
    const isOverDateKey = /^\d{4}-\d{2}-\d{2}$/.test(overId);
    let targetDateKey = overId;
    if (!isOverDateKey) {
      const overTask = tasks.find((t) => t._id === overId);
      if (overTask?.dueDate) {
        targetDateKey = overTask.dueDate.split("T")[0];
      } else {
        return;
      }
    }

    const currentTask = tasks.find((t) => t._id === taskId);
    if (!currentTask) return;
    const currentDate = currentTask.dueDate?.split("T")[0];

    // Same column — reorder
    if (currentDate === targetDateKey && !isOverDateKey) {
      const dayTasks = tasks
        .filter((t) => t.dueDate && t.dueDate.startsWith(targetDateKey))
        .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

      const oldIndex = dayTasks.findIndex((t) => t._id === taskId);
      const newIndex = dayTasks.findIndex((t) => t._id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = [...dayTasks];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      // Assign new sortOrder values
      const updates: Record<string, number> = {};
      reordered.forEach((t, i) => { updates[t._id!] = i; });

      setTasks((prev) => prev.map((t) => updates[t._id!] !== undefined ? { ...t, sortOrder: updates[t._id!] } : t));

      // Persist sort orders
      Promise.all(
        reordered.map((t, i) =>
          fetch(`/api/tasks/${t._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sortOrder: i }),
          })
        )
      ).catch(() => fetchTasks());
      return;
    }

    // Different column — move task
    if (currentDate !== targetDateKey) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndoAction({ taskId, prevDueDate: currentDate || "", label: currentTask.title });
      undoTimerRef.current = setTimeout(() => setUndoAction(null), 8000);

      setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, dueDate: targetDateKey } : t));

      fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: targetDateKey }),
      }).catch(() => fetchTasks());
    }
  };

  const handleUndo = async () => {
    if (!undoAction) return;
    const { taskId, prevDueDate } = undoAction;
    setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, dueDate: prevDueDate } : t));
    setUndoAction(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: prevDueDate }),
      });
    } catch { fetchTasks(); }
  };

  const handleTaskUpdate = async (taskId: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, ...updated } : t)));
      if (selectedTask?._id === taskId) setSelectedTask((prev) => prev ? { ...prev, ...updated } : null);
    } catch (e) { console.error(e); }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      setSelectedTask(null);
    } catch (e) { console.error(e); }
  };

  const handleSort = (dateKey: string, by: string) => {
    setTasks((prev) => {
      const copy = [...prev];
      const dayTaskIds = new Set(copy.filter((t) => t.dueDate?.startsWith(dateKey)).map((t) => t._id));
      const dayTasks = copy.filter((t) => dayTaskIds.has(t._id));
      if (by === "name") dayTasks.sort((a, b) => a.title.localeCompare(b.title));
      else if (by === "created") dayTasks.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      else if (by === "done") dayTasks.sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0));
      const rest = copy.filter((t) => !dayTaskIds.has(t._id));
      return [...rest, ...dayTasks];
    });
  };

  const navigateToDate = (d: Date) => {
    const now = new Date();
    const nowDay = now.getDay();
    const nowMonday = new Date(now);
    nowMonday.setDate(now.getDate() - (nowDay === 0 ? 6 : nowDay - 1));
    const targetDay = d.getDay();
    const targetMonday = new Date(d);
    targetMonday.setDate(d.getDate() - (targetDay === 0 ? 6 : targetDay - 1));
    const diffWeeks = Math.round((targetMonday.getTime() - nowMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(diffWeeks);
  };

  const openAddGeneral = () => { setAddModalDate(undefined); setShowAddModal(true); };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar onAddTask={openAddGeneral} />

        <div className="p-4 md:p-6 pb-24 md:pb-6">
          {/* ── Global Header: Today + Filter + Nav ─────── */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={() => { setShowCalendar(!showCalendar); setShowFilter(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-secondary border border-border text-text-secondary text-xs font-medium hover:bg-bg-hover transition-colors">
                  <Calendar size={13} /> Today
                </button>
                {showCalendar && <CalendarPopover current={weekDates[0]} onSelect={navigateToDate} onClose={() => setShowCalendar(false)} />}
              </div>
              <div className="relative">
                <button onClick={() => { setShowFilter(!showFilter); setShowCalendar(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-secondary border border-border text-text-secondary text-xs font-medium hover:bg-bg-hover transition-colors">
                  <SlidersHorizontal size={13} /> Filter
                </button>
                {showFilter && <FilterPopover selected={filterCat} onSelect={setFilterCat} onClose={() => setShowFilter(false)} />}
              </div>
              <button onClick={handleUndo} disabled={!undoAction}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  undoAction
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25 animate-pulse cursor-pointer"
                    : "bg-bg-secondary border-border text-text-muted/40 cursor-not-allowed"
                }`}>
                <Undo2 size={13} /> Undo
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekOffset((w) => w - 1)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted transition-colors"><ChevronLeft size={18} /></button>
              <button onClick={() => setWeekOffset(0)} className="px-3 py-1 rounded-lg text-[12px] font-medium hover:bg-bg-hover text-text-secondary transition-colors whitespace-nowrap">
                {(() => {
                  const wdStart = weekDates[0];
                  const wdEnd = weekDates[6];
                  const fmtDay = (d: Date) => {
                    const day = d.getDate();
                    const suffix = day === 1 || day === 21 || day === 31 ? "st" : day === 2 || day === 22 ? "nd" : day === 3 || day === 23 ? "rd" : "th";
                    return `${day}${suffix} ${d.toLocaleDateString("en-US", { month: "long" })}`;
                  };
                  return `${fmtDay(wdStart)} - ${fmtDay(wdEnd)}`;
                })()}
              </button>
              <button onClick={() => setWeekOffset((w) => w + 1)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted transition-colors"><ChevronRight size={18} /></button>
            </div>
          </div>

          {/* ── Weekly Columns ─────────────────────────── */}
          <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="relative">
              <div className="grid grid-cols-7 gap-4 mb-8">
                {weekDates.map((date) => {
                  const key = toDateKey(date);
                  const dayTasks = tasksByDay[key] || [];
                  const today = isToday(date);
                  const doneCount = dayTasks.filter((t) => t.status === "done").length;
                  const totalCount = dayTasks.length;
                  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

                  return (
                    <DayColumn key={key} id={key} isHighlighted={overColumnId === key}>
                      {/* Day Header */}
                      <div className="mb-3">
                        <h3 className={`text-base font-bold ${today ? "text-accent" : "text-text-primary"}`}>
                          {DAY_NAMES_FULL[date.getDay()]}
                        </h3>
                        <p className="text-[11px] text-text-muted">
                          {date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                        </p>
                        <div className="mt-2 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${progress}%`, backgroundColor: "#e7ca79" }} />
                        </div>
                      </div>

                      {/* Add task row (card-like) */}
                      <div className="mb-2">
                        <button onClick={() => setAddTaskDay(addTaskDay === key ? null : key)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-secondary/60 hover:bg-bg-secondary border border-border/50 hover:border-border text-text-muted hover:text-text-secondary transition-all text-xs">
                          <Plus size={14} />
                          <span className="flex-1 text-left">Add task</span>
                          <span onClick={(e) => { e.stopPropagation(); setSortMenuDay(sortMenuDay === key ? null : key); }}
                            className="p-0.5 rounded hover:bg-bg-hover transition-colors" title="Reorder">
                            <ArrowUpDown size={12} />
                          </span>
                        </button>
                        {sortMenuDay === key && (
                          <div className="relative">
                            <SortMenu onSort={(by) => handleSort(key, by)} onClose={() => setSortMenuDay(null)} />
                          </div>
                        )}
                      </div>

                      {/* Task Cards */}
                      <SortableContext items={dayTasks.map((t) => t._id!)} strategy={verticalListSortingStrategy}>
                        <div className="min-h-[120px] space-y-2">
                          {dayTasks.map((task) => (
                            <TaskCard key={task._id} task={task} onSelect={setSelectedTask} onComplete={handleComplete}
                              isDragging={activeDragId === task._id} />
                          ))}
                        </div>
                      </SortableContext>
                    </DayColumn>
                  );
                })}
              </div>

              {/* Add Task Popup — positioned below Add task row, spanning grid */}
              {addTaskDay && (
                <AddTaskPopup
                  dateKey={addTaskDay}
                  onAdd={handleInlineAdd}
                  onClose={() => setAddTaskDay(null)}
                  categories={CATEGORIES}
                />
              )}
            </div>
            <DragOverlay dropAnimation={{
              duration: 200,
              easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
            }}>
              {activeDragId ? (() => {
                const task = tasks.find((t) => t._id === activeDragId);
                if (!task) return null;
                const color = CAT_COLORS[task.category] || "#666";
                return (
                  <div className="rounded-xl border bg-bg-secondary border-border shadow-2xl overflow-hidden w-[160px] rotate-[2deg]"
                    style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
                    <div className="px-2.5 pt-2 pb-1.5">
                      <p className="text-[11px] font-semibold leading-snug text-text-primary"
                        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {task.title}
                      </p>
                      <span className="text-[8px] text-text-muted capitalize">{task.category}</span>
                    </div>
                  </div>
                );
              })() : null}
            </DragOverlay>
          </DndContext>
        </div>

        <AddTaskModal
          isOpen={showAddModal}
          onClose={() => { setShowAddModal(false); setAddModalDate(undefined); }}
          onSave={handleAddTask}
          initialDate={addModalDate}
        />

        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={(updates) => handleTaskUpdate(selectedTask._id!, updates)}
            onComplete={() => { handleComplete(selectedTask._id!); setSelectedTask(null); }}
            onDelete={() => handleDeleteTask(selectedTask._id!)}
            onStartTimer={() => {}}
          />
        )}
      </main>
    </div>
  );
}
