"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Check, Calendar, SlidersHorizontal,
  ArrowUpDown, Hash, Clock, Target, ArrowUp, Link2, X, Search, Undo2,
  CalendarDays, LayoutGrid,
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

function isRecurringOnDate(task: Task, date: Date): boolean {
  if (!task.recurring || task.status === "done") return false;
  const dow = date.getDay();
  switch (task.recurring.type) {
    case "daily": return true;
    case "weekdays": return dow >= 1 && dow <= 5;
    case "weekends": return dow === 0 || dow === 6;
    case "weekly": return task.recurring.days?.includes(dow) ?? false;
    case "custom": return task.recurring.days?.includes(dow) ?? false;
    default: return false;
  }
}

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
  const offset = firstDay === 0 ? 6 : firstDay - 1;

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
          const todayDay = isToday(d);
          const sel = isSameDay(d, current);
          return (
            <button key={i} onClick={() => { onSelect(d); onClose(); }}
              className={`w-7 h-7 rounded-full text-[11px] transition-colors ${sel ? "bg-accent text-text-inverse font-bold" : todayDay ? "ring-1 ring-accent text-accent font-semibold" : "text-text-secondary hover:bg-bg-hover"}`}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add Task Popup ──────────────────────────────────────────
function AddTaskPopup({ dateKey, onAdd, onClose, categories }: {
  dateKey: string; onAdd: (data: Record<string, unknown>) => void; onClose: () => void; categories: typeof CATEGORIES;
}) {
  const [title, setTitle] = useState("");
  const [showTime, setShowTime] = useState(false);
  const [showChannel, setShowChannel] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dateKey);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [category, setCategory] = useState<string>("trabajo");
  const [subcategory, setSubcategory] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const timeRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-1/2 -translate-x-1/2 w-[50%] top-[105px] z-50 bg-[#2a2a2e] rounded-xl border border-border/40 shadow-2xl overflow-visible">
        <div className="px-3.5 pt-3 pb-1.5">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
            placeholder="Task description..."
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none" />
        </div>
        <div className="px-3.5 pb-3 flex items-center gap-1.5">
          <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-medium whitespace-nowrap">
            <span className="text-[9px] font-bold">TIP</span> Paste a URL
          </span>
          <div className="relative">
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
    <div ref={setNodeRef}
      className={`rounded-xl p-2 min-h-[280px] min-w-[160px] md:min-w-0 flex-shrink-0 md:flex-shrink snap-center transition-all duration-200 ease-in-out ${
        isHighlighted ? "bg-[#e7ca79]/10 ring-2 ring-[#e7ca79]/30 shadow-[0_0_15px_rgba(231,202,121,0.15)]" : "bg-transparent"
      }`}>
      {children}
    </div>
  );
}

// ─── Draggable Task Card ──────────────────────────────────────
function TaskCard({ task, onSelect, onComplete, isDragging, dateKey }: {
  task: Task; onSelect: (t: Task) => void; onComplete: (id: string, dateKey?: string) => void; isDragging: boolean; dateKey?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task._id! });
  const color = CAT_COLORS[task.category] || "#666";
  const isDone = task.recurring && dateKey
    ? (task.completions?.includes(dateKey) ?? false)
    : task.status === "done";
  const est = (task as unknown as Record<string, unknown>).estimatedTime as number | undefined;
  const spent = task.timeSpent || 0;

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="rounded-xl border transition-all cursor-grab active:cursor-grabbing overflow-hidden bg-bg-secondary border-border hover:border-border/80 shadow-sm hover:shadow-md">
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
                <div className={`w-3 h-3 rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center ${sub.done ? "bg-emerald-500 border-emerald-500" : "border-text-muted/30"}`}>
                  {sub.done && <Check size={6} className="text-white" strokeWidth={3} />}
                </div>
                <span className={`text-[9px] truncate ${sub.done ? "line-through text-text-muted" : "text-text-secondary"}`}>{sub.text}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); onComplete(task._id!, dateKey); }}
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

// ─── Schedule Slot Popup ─────────────────────────────────────
function ScheduleSlotPopup({ dateKey, hour, minute, onAdd, onClose }: {
  dateKey: string; hour: number; minute: number;
  onAdd: (title: string, duration: number) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(60);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  const fmtSlot = (h: number, m: number) =>
    `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  const dateLabel = new Date(dateKey + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return (
    <div className="bg-bg-tertiary border border-border rounded-xl shadow-2xl p-3.5 w-60">
      <p className="text-[10px] font-semibold text-accent mb-2">{dateLabel} · {fmtSlot(hour, minute)}</p>
      <input autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) onAdd(title.trim(), duration); }}
        placeholder="Task name..."
        className="w-full bg-bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent mb-2" />
      <div className="flex items-center gap-1.5 mb-2.5">
        {[30, 60, 90, 120].map((m) => (
          <button key={m} onClick={() => setDuration(m)}
            className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-colors ${duration === m ? "bg-accent text-white" : "bg-bg-secondary text-text-muted hover:bg-bg-hover"}`}>
            {m < 60 ? `${m}m` : `${m / 60}h`}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-1.5">
        <button onClick={onClose} className="px-2.5 py-1 rounded-lg text-[11px] text-text-muted hover:bg-bg-hover transition-colors">Cancel</button>
        <button onClick={() => { if (title.trim()) onAdd(title.trim(), duration); }} disabled={!title.trim()}
          className="px-3 py-1 rounded-lg text-[11px] bg-accent text-white disabled:opacity-30 hover:bg-accent-hover transition-colors font-medium">
          Add task
        </button>
      </div>
    </div>
  );
}

// ─── Task Time Picker Popup ───────────────────────────────────
function TaskTimePickerPopup({ task, dateKey, onSchedule, onClose }: {
  task: Task; dateKey: string;
  onSchedule: (taskId: string, dateKey: string, hour: number, minute: number, duration: number) => void;
  onClose: () => void;
}) {
  const QUICK_HOURS = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21];
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [duration, setDuration] = useState(60);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  const fmtH = (h: number) => h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h-12}pm`;
  const color = CAT_COLORS[task.category] || "#666";
  return (
    <div className="bg-bg-tertiary border border-border rounded-xl shadow-2xl p-4 w-72">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <p className="text-xs font-semibold text-text-primary truncate flex-1">{task.title}</p>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={14} /></button>
      </div>
      {/* Quick hour grid */}
      <p className="text-[9px] text-text-muted uppercase tracking-wide mb-1.5">Select time</p>
      <div className="grid grid-cols-8 gap-1 mb-3">
        {QUICK_HOURS.map((h) => (
          <button key={h} onClick={() => setHour(h)}
            className={`py-1 rounded text-[9px] font-medium transition-colors ${hour === h ? "text-white" : "bg-bg-secondary text-text-muted hover:bg-bg-hover"}`}
            style={hour === h ? { background: color } : {}}>
            {fmtH(h)}
          </button>
        ))}
      </div>
      {/* Minute */}
      <div className="flex gap-1.5 mb-3">
        {[0, 15, 30, 45].map((m) => (
          <button key={m} onClick={() => setMinute(m)}
            className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${minute === m ? "text-white" : "bg-bg-secondary text-text-muted hover:bg-bg-hover"}`}
            style={minute === m ? { background: color } : {}}>
            :{String(m).padStart(2,"0")}
          </button>
        ))}
      </div>
      {/* Duration */}
      <p className="text-[9px] text-text-muted uppercase tracking-wide mb-1.5">Duration</p>
      <div className="flex gap-1.5 mb-4">
        {[30,60,90,120].map((d) => (
          <button key={d} onClick={() => setDuration(d)}
            className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${duration === d ? "text-white" : "bg-bg-secondary text-text-muted hover:bg-bg-hover"}`}
            style={duration === d ? { background: color } : {}}>
            {d < 60 ? `${d}m` : `${d/60}h`}
          </button>
        ))}
      </div>
      <button onClick={() => onSchedule(task._id!, dateKey, hour, minute, duration)}
        className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:brightness-110"
        style={{ background: color }}>
        Schedule at {hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:{String(minute).padStart(2,"0")}{hour < 12 ? "am" : "pm"}
      </button>
    </div>
  );
}

// ─── Schedule View ───────────────────────────────────────────
function ScheduleView({ weekDates, tasksByDay, onSelect, onAddAtSlot, onScheduleTask }: {
  weekDates: Date[];
  tasksByDay: Record<string, Task[]>;
  onSelect: (t: Task, dateKey: string) => void;
  onAddAtSlot: (dateKey: string, hour: number, minute: number, title: string, durationMins: number) => void;
  onScheduleTask: (taskId: string, dateKey: string, hour: number, minute: number, duration: number) => void;
}) {
  const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am–10pm
  const ROW_H = 64;
  const now = new Date();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [slotPopup, setSlotPopup] = useState<{ dateKey: string; hour: number; minute: number; x: number; y: number; duration: number } | null>(null);
  const [taskTimePicker, setTaskTimePicker] = useState<{ task: Task; dateKey: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = Math.max(0, (now.getHours() - 6 - 1.5) * ROW_H);
      scrollRef.current.scrollTop = scrollTo;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmtHour = (h: number) =>
    h < 12 ? `${h === 0 ? 12 : h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;

  // Helper: get effective startDate/estimatedTime for a task on a specific day (respects overrides)
  const getEffective = (task: Task, dateKey: string) => {
    const ov = task.overrides?.[dateKey];
    return {
      startDate: ov?.startDate || task.startDate,
      estimatedTime: ov?.estimatedTime ?? task.estimatedTime,
    };
  };

  const getTaskPos = (task: Task, dateKey: string) => {
    const { startDate, estimatedTime } = getEffective(task, dateKey);
    if (!startDate) return null;
    const d = new Date(startDate);
    const h = d.getHours(); const m = d.getMinutes();
    if (h < 6 || h > 22) return null;
    const durationMins = estimatedTime || 60;
    return {
      top: (h - 6) * ROW_H + (m / 60) * ROW_H,
      height: Math.max((durationMins / 60) * ROW_H - 2, 24),
    };
  };

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>, dateKey: string) => {
    if ((e.target as HTMLElement).closest("[data-task-block]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top + (scrollRef.current?.scrollTop || 0);
    const hourF = relY / ROW_H;
    const hour = Math.min(22, Math.floor(hourF) + 6);
    const minute = (hourF % 1) >= 0.5 ? 30 : 0;
    setSlotPopup({ dateKey, hour, minute, x: e.clientX, y: e.clientY, duration: 60 });
  };

  return (
    <div className="relative -mx-4 md:mx-0 rounded-xl border border-border overflow-hidden bg-bg-primary">
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">

          {/* ── Sticky day header ── */}
          <div className="sticky top-0 z-20 bg-bg-primary border-b border-border"
            style={{ display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)" }}>
            <div className="border-r border-border/30" />
            {weekDates.map((date) => {
              const key = toDateKey(date);
              const todayDay = isToday(date);
              const allDay = (tasksByDay[key] || []).filter((t) => !getEffective(t, key).startDate);
              return (
                <div key={key} className={`border-r border-border/30 ${todayDay ? "bg-accent/5" : ""}`}>
                  <div className="flex flex-col items-center py-2">
                    <span className={`text-[9px] font-bold tracking-widest uppercase mb-1 ${todayDay ? "text-accent" : "text-text-muted"}`}>
                      {["SUN","MON","TUE","WED","THU","FRI","SAT"][date.getDay()]}
                    </span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${todayDay ? "bg-accent" : ""}`}>
                      <span className={`text-base font-bold ${todayDay ? "text-white" : "text-text-primary"}`}>
                        {date.getDate()}
                      </span>
                    </div>
                  </div>
                  {allDay.length > 0 && (
                    <div className="px-1 pb-1.5 border-t border-border/20 space-y-0.5">
                      {allDay.slice(0, 3).map((task) => {
                        const color = CAT_COLORS[task.category] || "#666";
                        const isDone = task.recurring ? (task.completions?.includes(key) ?? false) : task.status === "done";
                        return (
                          <div key={task._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTaskTimePicker({ task, dateKey: key, x: e.clientX, y: e.clientY });
                            }}
                            title="Click to schedule at a specific time"
                            className={`group text-[8px] px-1.5 py-0.5 rounded-full cursor-pointer font-medium flex items-center gap-1 ${isDone ? "opacity-40 line-through" : "hover:brightness-110"}`}
                            style={{ background: color + "28", color }}>
                            <span className="truncate flex-1">{task.title}</span>
                            <Clock size={7} className="flex-shrink-0 opacity-0 group-hover:opacity-70 transition-opacity" />
                          </div>
                        );
                      })}
                      {allDay.length > 3 && (
                        <p className="text-[8px] text-text-muted px-1">+{allDay.length - 3} more</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Scrollable hourly grid ── */}
          <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 340px)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)" }}>

              {/* Time labels */}
              <div className="border-r border-border/30">
                {HOURS.map((hour) => (
                  <div key={hour} style={{ height: ROW_H }}
                    className="flex items-start justify-end pr-2 pt-1 border-t border-border/15 first:border-t-0">
                    <span className="text-[9px] text-text-muted leading-none -mt-2">{fmtHour(hour)}</span>
                  </div>
                ))}
              </div>

              {/* Day columns — absolute positioning inside each */}
              {weekDates.map((date) => {
                const key = toDateKey(date);
                const todayCol = isToday(date);
                const scheduled = (tasksByDay[key] || []).filter((t) => !!getEffective(t, key).startDate);
                const totalH = HOURS.length * ROW_H;

                return (
                  <div key={key}
                    className={`relative border-r border-border/30 ${todayCol ? "bg-accent/[0.025]" : ""}`}
                    style={{ height: totalH }}
                    onClick={(e) => handleColumnClick(e, key)}>

                    {/* Hour + half-hour lines */}
                    {HOURS.map((_, i) => (
                      <div key={i} className="absolute left-0 right-0 pointer-events-none">
                        <div className="absolute left-0 right-0 border-t border-border/15" style={{ top: i * ROW_H }} />
                        <div className="absolute left-6 right-0 border-t border-border/8" style={{ top: i * ROW_H + ROW_H / 2 }} />
                      </div>
                    ))}

                    {/* Current time indicator */}
                    {todayCol && (() => {
                      const h = now.getHours(); const m = now.getMinutes();
                      if (h < 6 || h > 22) return null;
                      const top = (h - 6) * ROW_H + (m / 60) * ROW_H;
                      return (
                        <div className="absolute left-0 right-0 z-10 pointer-events-none flex items-center" style={{ top }}>
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400 -ml-1.5 shadow flex-shrink-0" />
                          <div className="flex-1 h-[2px] bg-red-400 shadow-sm" />
                        </div>
                      );
                    })()}

                    {/* Click hint */}
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 pointer-events-none flex items-center justify-center transition-opacity">
                      <span className="text-[9px] text-accent/40 font-medium">+ click to add</span>
                    </div>

                    {/* Scheduled task blocks */}
                    {scheduled.map((task) => {
                      const pos = getTaskPos(task, key);
                      if (!pos) return null;
                      const { startDate: effSD, estimatedTime: effEst } = getEffective(task, key);
                      const hasOverride = !!task.overrides?.[key];
                      const color = CAT_COLORS[task.category] || "#666";
                      const isDone = task.recurring ? (task.completions?.includes(key) ?? false) : task.status === "done";
                      return (
                        <div key={task._id} data-task-block="1"
                          onClick={(e) => { e.stopPropagation(); onSelect(task, key); }}
                          className={`absolute left-0.5 right-0.5 rounded-lg overflow-hidden cursor-pointer z-[5] transition-all hover:z-[8] hover:shadow-lg ${isDone ? "opacity-40" : "hover:scale-[1.01]"}`}
                          style={{ top: pos.top + 1, height: pos.height, background: color + "30", borderLeft: `3px solid ${color}` }}>
                          <div className="px-2 py-1 h-full flex flex-col justify-center">
                            <p className="text-[10px] font-semibold leading-snug line-clamp-2" style={{ color }}>
                              {task.title}
                            </p>
                            {pos.height > 34 && (
                              <p className="text-[8px] leading-tight mt-0.5" style={{ color: color + "aa" }}>
                                {new Date(effSD!).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()}
                                {effEst ? ` · ${formatMins(effEst)}` : ""}
                                {hasOverride && <span className="ml-1 opacity-60">✦</span>}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Slot creation popup */}
      {slotPopup && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSlotPopup(null)} />
          <div className="fixed z-50 drop-shadow-2xl"
            style={{
              left: Math.min(slotPopup.x + 8, (typeof window !== "undefined" ? window.innerWidth : 800) - 256),
              top: Math.min(slotPopup.y - 20, (typeof window !== "undefined" ? window.innerHeight : 800) - 200),
            }}>
            <ScheduleSlotPopup
              dateKey={slotPopup.dateKey} hour={slotPopup.hour} minute={slotPopup.minute}
              onAdd={(title, duration) => {
                onAddAtSlot(slotPopup.dateKey, slotPopup.hour, slotPopup.minute, title, duration);
                setSlotPopup(null);
              }}
              onClose={() => setSlotPopup(null)} />
          </div>
        </>
      )}

      {/* Task time picker popup — schedule existing task to a time slot */}
      {taskTimePicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setTaskTimePicker(null)} />
          <div className="fixed z-50 drop-shadow-2xl"
            style={{
              left: Math.min(taskTimePicker.x + 8, (typeof window !== "undefined" ? window.innerWidth : 800) - 300),
              top: Math.min(taskTimePicker.y - 20, (typeof window !== "undefined" ? window.innerHeight : 800) - 320),
            }}>
            <TaskTimePickerPopup
              task={taskTimePicker.task}
              dateKey={taskTimePicker.dateKey}
              onSchedule={(taskId, dateKey, hour, minute, duration) => {
                onScheduleTask(taskId, dateKey, hour, minute, duration);
                setTaskTimePicker(null);
              }}
              onClose={() => setTaskTimePicker(null)} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskDate, setSelectedTaskDate] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState("all");
  const [showFilter, setShowFilter] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [sortMenuDay, setSortMenuDay] = useState<string | null>(null);
  const [addTaskDay, setAddTaskDay] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<{ taskId: string; prevDueDate: string; label: string } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [viewMode, setViewMode] = useState<"weekly" | "schedule">("weekly");
  useEffect(() => {
    const saved = localStorage.getItem("home-view-mode") as "weekly" | "schedule" | null;
    if (saved === "schedule") setViewMode("schedule");
  }, []);

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
  // Tasks by day (with filter) — includes recurring tasks
  const tasksByDay: Record<string, Task[]> = {};
  weekDates.forEach((d) => {
    const key = toDateKey(d);
    // Regular tasks with dueDate on this day
    let dayTasks = tasks.filter((t) => !t.recurring && t.dueDate && t.dueDate.startsWith(key));
    // Recurring tasks that apply to this day
    const recurringForDay = tasks.filter((t) => isRecurringOnDate(t, d));
    const seen = new Set(dayTasks.map((t) => t._id));
    recurringForDay.forEach((t) => { if (!seen.has(t._id)) dayTasks.push(t); });
    if (filterCat !== "all") dayTasks = dayTasks.filter((t) => t.category === filterCat);
    dayTasks.sort((a, b) => {
      const aDone = a.recurring ? (a.completions?.includes(key) ?? false) : a.status === "done";
      const bDone = b.recurring ? (b.completions?.includes(key) ?? false) : b.status === "done";
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
    });
    tasksByDay[key] = dayTasks;
  });

  const handleComplete = async (id: string, dateKey?: string) => {
    const task = tasks.find((t) => t._id === id);
    // Recurring task: toggle completion for the specific date
    if (task?.recurring && dateKey) {
      const already = task.completions?.includes(dateKey);
      if (already) {
        const next = (task.completions || []).filter((d) => d !== dateKey);
        setTasks((prev) => prev.map((t) => t._id === id ? { ...t, completions: next } : t));
        await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completions: next }) });
      } else {
        setTasks((prev) => prev.map((t) => t._id === id ? { ...t, completions: [...(t.completions || []), dateKey] } : t));
        await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addCompletion: dateKey }) });
      }
      fetchTasks();
      return;
    }
    // Regular task: toggle done/pending
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

  const handleScheduleTask = async (taskId: string, dateKey: string, hour: number, minute: number, durationMins: number) => {
    const task = tasks.find((t) => t._id === taskId);
    const sd = new Date(dateKey + "T00:00:00");
    sd.setHours(hour, minute, 0, 0);
    const iso = sd.toISOString();
    if (task?.recurring) {
      // Per-day override: only affects this specific date
      setTasks((prev) => prev.map((t) => t._id === taskId ? {
        ...t, overrides: { ...(t.overrides || {}), [dateKey]: { startDate: iso, estimatedTime: durationMins } }
      } : t));
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setOverride: { date: dateKey, startDate: iso, estimatedTime: durationMins } }),
      });
    } else {
      setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, startDate: iso, dueDate: dateKey } : t));
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: iso, dueDate: dateKey, estimatedTime: durationMins }),
      });
    }
    fetchTasks();
  };

  const handleAddAtSlot = async (dateKey: string, hour: number, minute: number, title: string, durationMins: number) => {
    const startDate = new Date(dateKey + "T00:00:00");
    startDate.setHours(hour, minute, 0, 0);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category: "trabajo",
          subcategory: CATEGORIES.trabajo.subcategories[0] || "general",
          priority: 3, roi: 5, joy: 5,
          dueDate: dateKey,
          startDate: startDate.toISOString(),
          estimatedTime: durationMins,
        }),
      });
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

  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const rectCollisions = rectIntersection(args);
    const containerCollisions = rectCollisions.filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.id as string));
    const itemCollisions = rectCollisions.filter((c) => !/^\d{4}-\d{2}-\d{2}$/.test(c.id as string));
    if (itemCollisions.length > 0) return itemCollisions;
    if (containerCollisions.length > 0) return containerCollisions;
    return rectCollisions;
  }, []);

  const handleDragStart = (event: DragStartEvent) => { setActiveDragId(event.active.id as string); };
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverColumnId(null); return; }
    const overId = over.id as string;
    if (/^\d{4}-\d{2}-\d{2}$/.test(overId)) {
      setOverColumnId(overId);
    } else {
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
    const isOverDateKey = /^\d{4}-\d{2}-\d{2}$/.test(overId);
    let targetDateKey = overId;

    if (!isOverDateKey) {
      const overTask = tasks.find((t) => t._id === overId);
      if (overTask?.dueDate) targetDateKey = overTask.dueDate.split("T")[0];
      else return;
    }

    const currentTask = tasks.find((t) => t._id === taskId);
    if (!currentTask) return;
    const currentDate = currentTask.dueDate?.split("T")[0];

    if (currentDate === targetDateKey && !isOverDateKey) {
      const dayTasks = tasks.filter((t) => t.dueDate && t.dueDate.startsWith(targetDateKey)).sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
      const oldIndex = dayTasks.findIndex((t) => t._id === taskId);
      const newIndex = dayTasks.findIndex((t) => t._id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = [...dayTasks];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const updates: Record<string, number> = {};
      reordered.forEach((t, i) => { updates[t._id!] = i; });
      setTasks((prev) => prev.map((t) => updates[t._id!] !== undefined ? { ...t, sortOrder: updates[t._id!] } : t));
      Promise.all(reordered.map((t, i) => fetch(`/api/tasks/${t._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: i }) }))).catch(() => fetchTasks());
      return;
    }

    if (currentDate !== targetDateKey) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndoAction({ taskId, prevDueDate: currentDate || "", label: currentTask.title });
      undoTimerRef.current = setTimeout(() => setUndoAction(null), 30000);
      setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, dueDate: targetDateKey } : t));
      fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dueDate: targetDateKey }) }).catch(() => fetchTasks());
    }
  };

  const handleUndo = async () => {
    if (!undoAction) return;
    const { taskId, prevDueDate } = undoAction;
    setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, dueDate: prevDueDate } : t));
    setUndoAction(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dueDate: prevDueDate }) });
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

  void (handleUpdateDueDate); void (loading); void (Target); void (Link2); void (X);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar onAddTask={() => setShowAddModal(true)} />

        <div className="p-4 md:p-6 pb-24 md:pb-6">
          {/* ── Global Header: Today + Filter + Nav ─────── */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
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
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center rounded-lg border border-border bg-bg-secondary overflow-hidden">
                <button onClick={() => { setViewMode("weekly"); localStorage.setItem("home-view-mode","weekly"); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "weekly" ? "bg-accent text-white" : "text-text-muted hover:bg-bg-hover"}`}>
                  <LayoutGrid size={13} /> Week
                </button>
                <button onClick={() => { setViewMode("schedule"); localStorage.setItem("home-view-mode","schedule"); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "schedule" ? "bg-accent text-white" : "text-text-muted hover:bg-bg-hover"}`}>
                  <CalendarDays size={13} /> Schedule
                </button>
              </div>
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

          {/* ── View: Weekly or Schedule ──────────────── */}
          {viewMode === "schedule" && (
            <ScheduleView weekDates={weekDates} tasksByDay={tasksByDay}
              onSelect={(t, dk) => { setSelectedTask(t); setSelectedTaskDate(dk); }}
              onAddAtSlot={handleAddAtSlot} onScheduleTask={handleScheduleTask} />
          )}

          {/* ── Weekly Columns ─────────────────────────── */}
          {viewMode === "weekly" && <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="relative">
              <div className="flex md:grid md:grid-cols-7 gap-4 mb-8 overflow-x-auto pb-4 md:pb-0 snap-x snap-mandatory md:snap-none -mx-4 px-4 md:mx-0 md:px-0">
                {weekDates.map((date) => {
                  const key = toDateKey(date);
                  const dayTasks = tasksByDay[key] || [];
                  const todayDay = isToday(date);
                  const doneCount = dayTasks.filter((t) => t.recurring ? (t.completions?.includes(key) ?? false) : t.status === "done").length;
                  const totalCount = dayTasks.length;
                  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

                  return (
                    <DayColumn key={key} id={key} isHighlighted={overColumnId === key}>
                      <div className="mb-3">
                        <h3 className={`text-base font-bold ${todayDay ? "text-accent" : "text-text-primary"}`}>
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

                      <SortableContext items={dayTasks.map((t) => t._id!)} strategy={verticalListSortingStrategy}>
                        <div className="min-h-[120px] space-y-2">
                          {dayTasks.map((task) => (
                            <TaskCard key={task._id} task={task}
                              onSelect={(t) => { setSelectedTask(t); setSelectedTaskDate(key); }}
                              onComplete={handleComplete}
                              isDragging={activeDragId === task._id} dateKey={key} />
                          ))}
                        </div>
                      </SortableContext>
                    </DayColumn>
                  );
                })}
              </div>

              {addTaskDay && (
                <AddTaskPopup
                  dateKey={addTaskDay}
                  onAdd={handleInlineAdd}
                  onClose={() => setAddTaskDay(null)}
                  categories={CATEGORIES}
                />
              )}
            </div>
            <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
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
          </DndContext>}
        </div>

        <AddTaskModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddTask}
        />

        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            dateKey={selectedTaskDate || undefined}
            onClose={() => { setSelectedTask(null); setSelectedTaskDate(null); }}
            onUpdate={(updates) => handleTaskUpdate(selectedTask._id!, updates)}
            onComplete={() => { handleComplete(selectedTask._id!); setSelectedTask(null); setSelectedTaskDate(null); }}
            onDelete={() => { handleDeleteTask(selectedTask._id!); setSelectedTaskDate(null); }}
            onStartTimer={() => {}}
          />
        )}
      </main>
    </div>
  );
}
