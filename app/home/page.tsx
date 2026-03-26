"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Check, Calendar, SlidersHorizontal,
  ArrowUpDown, Hash, Clock, Target, ArrowUp, Link2, X, Search,
} from "lucide-react";
import {
  DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay,
  PointerSensor, useSensor, useSensors, useDroppable,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import AddTaskModal from "@/components/AddTaskModal";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import { Task, CATEGORIES, Category } from "@/lib/types";
import { useTimerStore } from "@/lib/timerStore";

const CAT_COLORS: Record<string, string> = {
  trabajo: "#d4a04e",
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
function toDateKey(d: Date) { return d.toISOString().split("T")[0]; }
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
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [category, setCategory] = useState<string>("trabajo");
  const [subcategory, setSubcategory] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (timeRef.current && !timeRef.current.contains(e.target as Node)) setShowTime(false);
      if (channelRef.current && !channelRef.current.contains(e.target as Node)) setShowChannel(false);
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
      priority: 3, roi: 5, joy: 5, dueDate: dateKey,
      ...(estimatedTime > 0 ? { estimatedTime } : {}),
    });
    setTitle(""); setEstimatedTime(0); setCategory("trabajo"); setSubcategory(""); onClose();
  };

  const dateLabel = (() => {
    const d = new Date(dateKey + "T00:00:00");
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  })();

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-bg-secondary rounded-2xl border border-border shadow-2xl mx-4 overflow-visible">
        <div className="p-4">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
            placeholder="Task description..."
            className="w-full bg-transparent text-base text-text-primary placeholder:text-text-muted focus:outline-none" />
        </div>
        <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-[11px] font-semibold">
            TIP <span className="text-text-muted font-normal">Paste a URL</span>
          </span>
          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-tertiary hover:bg-bg-hover text-[11px] text-text-muted transition-colors">
            <Calendar size={12} /> {dateLabel}
          </button>
          <div className="relative" ref={timeRef}>
            <button onClick={() => setShowTime(!showTime)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-tertiary hover:bg-bg-hover text-[11px] text-text-muted transition-colors">
              <Clock size={12} /> {estimatedTime > 0 ? formatMins(estimatedTime) : "--:--"}
            </button>
            {showTime && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-bg-tertiary border border-border rounded-xl shadow-2xl z-50 p-2.5 animate-slide-in-right">
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
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-tertiary hover:bg-bg-hover text-[11px] text-text-muted transition-colors">
              <Hash size={12} /> {subcategory || "channel"}
            </button>
            {showChannel && (
              <div className="absolute top-full left-0 mt-2 w-60 bg-bg-tertiary border border-border rounded-xl shadow-2xl z-50 p-2 max-h-56 overflow-y-auto animate-slide-in-right">
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
          <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg-tertiary hover:bg-bg-hover text-[11px] text-text-muted transition-colors">
            <Target size={12} />
          </button>
          <button onClick={submit} disabled={!title.trim()}
            className="ml-auto p-2 rounded-lg bg-accent hover:bg-accent-hover text-text-inverse transition-colors disabled:opacity-30">
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </div>
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
    <div ref={ref} className="absolute top-full right-0 mt-2 w-56 bg-bg-tertiary border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-in-right">
      <div className="px-3 py-2.5 border-b border-border">
        <p className="text-[11px] text-text-muted">Reorder unscheduled tasks by:</p>
      </div>
      <div className="py-1">
        {[
          { key: "name", label: "Name A-Z", icon: "A-Z" },
          { key: "created", label: "Date created", icon: "📅" },
          { key: "done", label: "Done status", icon: "✓" },
        ].map((opt) => (
          <button key={opt.key} onClick={() => { onSort(opt.key); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-primary hover:bg-bg-hover transition-colors">
            <span className="w-5 text-center text-text-muted text-xs">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Droppable Day Column ─────────────────────────────────────
function DayColumn({ id, children }: { id: string; isOver: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef}
      className={`transition-colors rounded-lg ${isOver ? "bg-accent-subtle/20 ring-1 ring-accent/20" : ""}`}>
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
    opacity: isDragging ? 0.3 : isDone ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`rounded-xl border transition-all cursor-grab active:cursor-grabbing overflow-hidden ${
        isDone ? "bg-bg-primary/30 border-border/30" : "bg-bg-secondary border-border hover:border-border/80 shadow-sm hover:shadow-md"
      }`}>
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
          <span className="text-[8px] font-medium truncate max-w-[60%] text-right" style={{ color: isDone ? `${color}50` : color }}>
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
      return 0;
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newDateKey = over.id as string;

    // Find current task's date
    const currentTask = tasks.find((t) => t._id === taskId);
    if (!currentTask) return;
    const currentDate = currentTask.dueDate?.split("T")[0];
    if (currentDate === newDateKey) return;

    // Update local state immediately
    setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, dueDate: newDateKey } : t));

    // Persist to DB
    fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate: newDateKey }),
    }).catch(() => fetchTasks());
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-7 gap-4 mb-8">
              {weekDates.map((date) => {
                const key = toDateKey(date);
                const dayTasks = tasksByDay[key] || [];
                const today = isToday(date);
                const doneCount = dayTasks.filter((t) => t.status === "done").length;
                const totalCount = dayTasks.length;
                const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

                return (
                  <DayColumn key={key} id={key} isOver={false}>
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
                          style={{ width: `${progress}%`, backgroundColor: progress === 100 ? "#10B981" : "#22C55E" }} />
                      </div>
                    </div>

                    {/* Add task + Sort */}
                    <div className="mb-2 flex items-center gap-1">
                      <button onClick={() => setAddTaskDay(key)}
                        className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-secondary/60 hover:bg-bg-secondary border border-border/50 hover:border-border text-text-muted hover:text-text-secondary transition-all text-xs">
                        <Plus size={14} /> Add task
                      </button>
                      <div className="relative">
                        <button onClick={() => setSortMenuDay(sortMenuDay === key ? null : key)}
                          className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted transition-colors" title="Reorder">
                          <ArrowUpDown size={13} />
                        </button>
                        {sortMenuDay === key && <SortMenu onSort={(by) => handleSort(key, by)} onClose={() => setSortMenuDay(null)} />}
                      </div>
                    </div>

                    {/* Task Cards */}
                    <div className="min-h-[120px] space-y-2">
                      {dayTasks.map((task) => (
                        <TaskCard key={task._id} task={task} onSelect={setSelectedTask} onComplete={handleComplete}
                          isDragging={activeDragId === task._id} />
                      ))}
                    </div>
                  </DayColumn>
                );
              })}
            </div>
            <DragOverlay>
              {activeDragId ? (() => {
                const task = tasks.find((t) => t._id === activeDragId);
                if (!task) return null;
                return (
                  <div className="rounded-xl border bg-bg-elevated border-accent/40 shadow-xl scale-[1.02] overflow-hidden opacity-90 w-[160px]">
                    <div className="px-2.5 pt-2 pb-1.5">
                      <p className="text-[11px] font-semibold leading-snug text-text-primary"
                        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {task.title}
                      </p>
                    </div>
                  </div>
                );
              })() : null}
            </DragOverlay>
          </DndContext>
        </div>

        {addTaskDay && (
          <AddTaskPopup
            dateKey={addTaskDay}
            onAdd={handleInlineAdd}
            onClose={() => setAddTaskDay(null)}
            categories={CATEGORIES}
          />
        )}

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
