"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Task, CATEGORIES, Category } from "@/lib/types";
import { usePulseStore } from "@/lib/pulseStore";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from "recharts";
import {
  ChevronLeft, ChevronRight, Flame, TrendingUp, TrendingDown,
  Clock, CheckCircle2, Target, Zap, Activity, Calendar,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekRange(offset: number) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1) + offset * 7);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { start: mon, end: sun };
}

function getMonthRange(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function formatDateRange(start: Date, end: Date, mode: "week" | "month") {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  if (mode === "week") {
    return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
  }
  const fullMonths = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return `${fullMonths[start.getMonth()]} ${start.getFullYear()}`;
}

function formatMins(secs: number): string {
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ─── Tooltip ────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  background: "rgba(26,26,26,0.95)",
  border: "1px solid rgba(231,202,121,0.2)",
  borderRadius: "10px",
  color: "#F3F4F6",
  fontSize: "12px",
  backdropFilter: "blur(8px)",
};

// ─── Main Page ──────────────────────────────────────────────
export default function StatsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"week" | "month">("week");
  const [offset, setOffset] = useState(0);
  const { pulse, minutesActive, streakDays, tasksCompletedToday, totalTasksToday } = usePulseStore();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Date range
  const range = useMemo(() => {
    return mode === "week" ? getWeekRange(offset) : getMonthRange(offset);
  }, [mode, offset]);

  // Filter tasks in range
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const dateStr = t.completedAt || t.dueDate;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= range.start && d <= range.end;
    });
  }, [tasks, range]);

  const completedInRange = useMemo(() => filtered.filter((t) => t.status === "done"), [filtered]);
  const totalInRange = filtered.length;
  const doneCount = completedInRange.length;
  const execRate = totalInRange > 0 ? Math.round((doneCount / totalInRange) * 100) : 0;
  const totalTimeSecs = completedInRange.reduce((s, t) => s + (t.timeSpent || 0), 0);

  // Previous period for comparison
  const prevRange = useMemo(() => {
    return mode === "week" ? getWeekRange(offset - 1) : getMonthRange(offset - 1);
  }, [mode, offset]);

  const prevFiltered = useMemo(() => {
    return tasks.filter((t) => {
      const dateStr = t.completedAt || t.dueDate;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= prevRange.start && d <= prevRange.end;
    });
  }, [tasks, prevRange]);

  const prevDone = prevFiltered.filter((t) => t.status === "done").length;
  const doneDelta = prevDone > 0 ? Math.round(((doneCount - prevDone) / prevDone) * 100) : 0;

  // ─── Insight Banner ─────────────────────────────────────
  const insight = useMemo(() => {
    if (doneCount === 0) return { text: "Aún no has completado tareas este periodo. ¡Empieza ahora!", icon: Target, color: "text-text-muted" };
    if (execRate >= 80) return { text: `Tasa de ejecución del ${execRate}% — Estás en racha 🔥`, icon: TrendingUp, color: "text-emerald-400" };
    if (execRate >= 50) return { text: `Tasa de ejecución del ${execRate}% — Buen ritmo, sigue así`, icon: Activity, color: "text-accent-text" };
    return { text: `Tasa de ejecución del ${execRate}% — Hay espacio para mejorar`, icon: TrendingDown, color: "text-orange-400" };
  }, [doneCount, execRate]);

  // ─── Daily tasks chart data ─────────────────────────────
  const dailyData = useMemo(() => {
    if (mode === "week") {
      const days: { label: string; completadas: number; pendientes: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(range.start);
        d.setDate(d.getDate() + i);
        const key = toLocalDateKey(d);
        const dayTasks = tasks.filter((t) => {
          const td = t.dueDate || t.completedAt;
          return td && td.startsWith(key);
        });
        days.push({
          label: DAY_LABELS[i],
          completadas: dayTasks.filter((t) => t.status === "done").length,
          pendientes: dayTasks.filter((t) => t.status !== "done").length,
        });
      }
      return days;
    } else {
      // Group by week of month
      const weeks: Record<string, { completadas: number; pendientes: number }> = {};
      const daysInMonth = new Date(range.start.getFullYear(), range.start.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(range.start.getFullYear(), range.start.getMonth(), i);
        const weekNum = `S${Math.ceil(i / 7)}`;
        if (!weeks[weekNum]) weeks[weekNum] = { completadas: 0, pendientes: 0 };
        const key = toLocalDateKey(d);
        const dayTasks = tasks.filter((t) => {
          const td = t.dueDate || t.completedAt;
          return td && td.startsWith(key);
        });
        weeks[weekNum].completadas += dayTasks.filter((t) => t.status === "done").length;
        weeks[weekNum].pendientes += dayTasks.filter((t) => t.status !== "done").length;
      }
      return Object.entries(weeks).map(([label, data]) => ({ label, ...data }));
    }
  }, [tasks, range, mode]);

  // ─── Category breakdown ─────────────────────────────────
  const categoryData = useMemo(() => {
    return (Object.keys(CATEGORIES) as Category[])
      .map((cat) => {
        const catTasks = completedInRange.filter((t) => t.category === cat);
        return {
          name: CATEGORIES[cat].label,
          value: catTasks.length,
          time: catTasks.reduce((s, t) => s + (t.timeSpent || 0), 0),
          color: CATEGORIES[cat].color,
        };
      })
      .filter((d) => d.value > 0);
  }, [completedInRange]);

  // ─── 28-day heatmap ─────────────────────────────────────
  const heatmapData = useMemo(() => {
    const data: { date: string; count: number; label: string }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = toLocalDateKey(d);
      const count = tasks.filter(
        (t) => t.status === "done" && t.completedAt && t.completedAt.startsWith(key)
      ).length;
      data.push({ date: key, count, label: `${d.getDate()}/${d.getMonth() + 1}` });
    }
    return data;
  }, [tasks]);

  const heatmapMax = Math.max(...heatmapData.map((d) => d.count), 1);

  // ─── Productivity time distribution (area chart) ─────────
  const timeDistribution = useMemo(() => {
    return completedInRange
      .filter((t) => t.completedAt)
      .reduce((acc, t) => {
        const hour = new Date(t.completedAt!).getHours();
        const bucket = `${String(hour).padStart(2, "0")}:00`;
        const existing = acc.find((a) => a.hora === bucket);
        if (existing) existing.tareas++;
        else acc.push({ hora: bucket, tareas: 1 });
        return acc;
      }, [] as { hora: string; tareas: number }[])
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [completedInRange]);

  // ─── Diagnostics ────────────────────────────────────────
  const diagnostics = useMemo(() => {
    const items: { label: string; value: string; status: "good" | "warning" | "bad" }[] = [];
    // Execution rate
    items.push({
      label: "Tasa de ejecución",
      value: `${execRate}%`,
      status: execRate >= 70 ? "good" : execRate >= 40 ? "warning" : "bad",
    });
    // Consistency
    items.push({
      label: "Racha actual",
      value: `${streakDays} días`,
      status: streakDays >= 7 ? "good" : streakDays >= 3 ? "warning" : "bad",
    });
    // Avg tasks/day
    const daysInPeriod = mode === "week" ? 7 : new Date(range.start.getFullYear(), range.start.getMonth() + 1, 0).getDate();
    const avgPerDay = (doneCount / Math.max(daysInPeriod, 1)).toFixed(1);
    items.push({
      label: "Promedio tareas/día",
      value: avgPerDay,
      status: Number(avgPerDay) >= 3 ? "good" : Number(avgPerDay) >= 1 ? "warning" : "bad",
    });
    // Time investment
    const avgMinPerTask = doneCount > 0 ? Math.round(totalTimeSecs / 60 / doneCount) : 0;
    items.push({
      label: "Tiempo prom/tarea",
      value: avgMinPerTask > 0 ? `${avgMinPerTask}m` : "—",
      status: avgMinPerTask >= 15 ? "good" : avgMinPerTask >= 5 ? "warning" : "bad",
    });
    return items;
  }, [execRate, streakDays, doneCount, mode, range, totalTimeSecs]);

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar hideAdd />
        <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h1 className="font-heading font-bold text-xl text-text-primary">Estadísticas</h1>
            <div className="flex items-center gap-2">
              {/* Mode toggle */}
              <div className="flex rounded-lg overflow-hidden border border-border text-xs">
                <button
                  onClick={() => { setMode("week"); setOffset(0); }}
                  className={`px-3 py-1.5 font-medium transition-colors ${mode === "week" ? "bg-accent/20 text-accent-text" : "text-text-muted hover:text-text-secondary"}`}
                >
                  Semanal
                </button>
                <button
                  onClick={() => { setMode("month"); setOffset(0); }}
                  className={`px-3 py-1.5 font-medium transition-colors ${mode === "month" ? "bg-accent/20 text-accent-text" : "text-text-muted hover:text-text-secondary"}`}
                >
                  Mensual
                </button>
              </div>
              {/* Navigation */}
              <div className="flex items-center gap-1">
                <button onClick={() => setOffset((o) => o - 1)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted"><ChevronLeft size={16} /></button>
                <span className="text-xs text-text-secondary font-medium min-w-[140px] text-center">
                  {formatDateRange(range.start, range.end, mode)}
                </span>
                <button onClick={() => setOffset((o) => Math.min(o + 1, 0))} disabled={offset >= 0} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-xl bg-bg-secondary border border-border animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Insight Banner */}
              <div className="mb-6 p-4 rounded-xl border border-border bg-bg-secondary/60 backdrop-blur-sm flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-bg-hover ${insight.color}`}>
                  <insight.icon size={20} />
                </div>
                <p className={`text-sm font-medium ${insight.color}`}>{insight.text}</p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <StatCard
                  icon={<CheckCircle2 size={18} />}
                  label="Completadas"
                  value={doneCount.toString()}
                  sub={doneDelta !== 0 ? `${doneDelta > 0 ? "+" : ""}${doneDelta}% vs anterior` : ""}
                  accent
                />
                <StatCard
                  icon={<Target size={18} />}
                  label="Tasa de ejecución"
                  value={`${execRate}%`}
                  sub={`${doneCount} de ${totalInRange} tareas`}
                />
                <StatCard
                  icon={<Clock size={18} />}
                  label="Tiempo invertido"
                  value={formatMins(totalTimeSecs)}
                  sub={doneCount > 0 ? `~${Math.round(totalTimeSecs / 60 / doneCount)}m por tarea` : ""}
                />
                <StatCard
                  icon={<Flame size={18} />}
                  label="Racha"
                  value={`${streakDays}d`}
                  sub={streakDays >= 7 ? "¡Imparable!" : streakDays >= 3 ? "Buen ritmo" : "Construyendo..."}
                  streak={streakDays}
                />
              </div>

              {/* Charts row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Daily tasks bar chart */}
                <div className="rounded-xl bg-bg-secondary border border-border p-5">
                  <h3 className="font-heading font-semibold text-sm text-text-secondary mb-4 flex items-center gap-2">
                    <Calendar size={14} className="text-accent-text" />
                    Tareas por {mode === "week" ? "día" : "semana"}
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dailyData} barCategoryGap="20%">
                      <XAxis dataKey="label" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="completadas" stackId="a" fill="#e7ca79" radius={[0, 0, 0, 0]} name="Completadas" />
                      <Bar dataKey="pendientes" stackId="a" fill="rgba(231,202,121,0.2)" radius={[4, 4, 0, 0]} name="Pendientes" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Category breakdown pie */}
                <div className="rounded-xl bg-bg-secondary border border-border p-5">
                  <h3 className="font-heading font-semibold text-sm text-text-secondary mb-4 flex items-center gap-2">
                    <Zap size={14} className="text-accent-text" />
                    Distribución por categoría
                  </h3>
                  {categoryData.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="55%" height={220}>
                        <PieChart>
                          <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={52} paddingAngle={3}>
                            {categoryData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {categoryData.map((d) => (
                          <div key={d.name} className="flex items-center gap-2 text-xs">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                            <span className="text-text-secondary truncate flex-1">{d.name}</span>
                            <span className="font-mono text-text-primary font-medium">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[220px] text-text-muted text-sm">Sin datos</div>
                  )}
                </div>
              </div>

              {/* Charts row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Productivity hours area chart */}
                {timeDistribution.length > 0 && (
                  <div className="rounded-xl bg-bg-secondary border border-border p-5">
                    <h3 className="font-heading font-semibold text-sm text-text-secondary mb-4 flex items-center gap-2">
                      <Activity size={14} className="text-accent-text" />
                      Horas más productivas
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={timeDistribution}>
                        <defs>
                          <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#e7ca79" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#e7ca79" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="hora" tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Area type="monotone" dataKey="tareas" stroke="#e7ca79" strokeWidth={2} fill="url(#goldGrad)" name="Tareas" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Pulse Status */}
                <div className="rounded-xl bg-bg-secondary border border-border p-5">
                  <h3 className="font-heading font-semibold text-sm text-text-secondary mb-4 flex items-center gap-2">
                    <Activity size={14} className="text-accent-text" />
                    Estado Pulse
                  </h3>
                  <div className="flex items-center gap-6">
                    {/* Pulse circle */}
                    <div className="relative w-28 h-28 flex-shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                        <circle
                          cx="50" cy="50" r="42" fill="none"
                          stroke={pulse.color}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${pulse.percentage * 2.64} 264`}
                          style={{ transition: "stroke-dasharray 1s ease" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold font-mono" style={{ color: pulse.color }}>
                          {pulse.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">Estado actual</div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: pulse.badgeBg, color: pulse.color }}>
                            {pulse.label}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-text-muted">Sesión</span>
                          <p className="font-mono font-semibold text-text-primary">{formatMins(minutesActive * 60)}</p>
                        </div>
                        <div>
                          <span className="text-text-muted">Hoy</span>
                          <p className="font-mono font-semibold text-text-primary">{tasksCompletedToday}/{totalTasksToday}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 28-Day Activity Heatmap */}
              <div className="rounded-xl bg-bg-secondary border border-border p-5 mb-4">
                <h3 className="font-heading font-semibold text-sm text-text-secondary mb-4 flex items-center gap-2">
                  <Flame size={14} className="text-accent-text" />
                  Actividad últimos 28 días
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {heatmapData.map((d) => {
                    const intensity = d.count / heatmapMax;
                    const bg = d.count === 0
                      ? "rgba(255,255,255,0.04)"
                      : `rgba(231,202,121,${0.15 + intensity * 0.75})`;
                    return (
                      <div
                        key={d.date}
                        className="group relative"
                      >
                        <div
                          className="w-8 h-8 md:w-9 md:h-9 rounded-md transition-all hover:scale-110 cursor-default flex items-center justify-center"
                          style={{ background: bg }}
                        >
                          {d.count > 0 && (
                            <span className="text-[9px] font-mono font-bold" style={{ color: intensity > 0.5 ? "#1a1a1a" : "#e7ca79" }}>
                              {d.count}
                            </span>
                          )}
                        </div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-[10px] bg-bg-elevated border border-border shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {d.label}: {d.count} tarea{d.count !== 1 ? "s" : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-3 text-[10px] text-text-muted">
                  <span>Menos</span>
                  {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                    <div
                      key={v}
                      className="w-4 h-4 rounded-sm"
                      style={{ background: v === 0 ? "rgba(255,255,255,0.04)" : `rgba(231,202,121,${0.15 + v * 0.75})` }}
                    />
                  ))}
                  <span>Más</span>
                </div>
              </div>

              {/* Diagnostics */}
              <div className="rounded-xl bg-bg-secondary border border-border p-5 mb-4">
                <h3 className="font-heading font-semibold text-sm text-text-secondary mb-4 flex items-center gap-2">
                  <TrendingUp size={14} className="text-accent-text" />
                  Diagnóstico de Productividad
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {diagnostics.map((d) => (
                    <div key={d.label} className="p-3 rounded-lg bg-bg-primary/50 border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${d.status === "good" ? "bg-emerald-400" : d.status === "warning" ? "bg-amber-400" : "bg-red-400"}`} />
                        <span className="text-[10px] text-text-muted uppercase tracking-wider">{d.label}</span>
                      </div>
                      <p className="font-mono font-bold text-lg text-text-primary">{d.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time by category (horizontal bars) */}
              {categoryData.some((d) => d.time > 0) && (
                <div className="rounded-xl bg-bg-secondary border border-border p-5">
                  <h3 className="font-heading font-semibold text-sm text-text-secondary mb-4 flex items-center gap-2">
                    <Clock size={14} className="text-accent-text" />
                    Tiempo por categoría
                  </h3>
                  <div className="space-y-3">
                    {categoryData
                      .filter((d) => d.time > 0)
                      .sort((a, b) => b.time - a.time)
                      .map((d) => {
                        const maxTime = Math.max(...categoryData.map((c) => c.time), 1);
                        const pct = (d.time / maxTime) * 100;
                        return (
                          <div key={d.name} className="flex items-center gap-3">
                            <span className="text-xs text-text-secondary w-28 truncate">{d.name}</span>
                            <div className="flex-1 h-5 bg-bg-primary/50 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, background: d.color }}
                              />
                            </div>
                            <span className="text-xs font-mono text-text-muted w-14 text-right">{formatMins(d.time)}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
  streak,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  streak?: number;
}) {
  return (
    <div className={`p-4 rounded-xl border transition-all ${accent ? "bg-accent/5 border-accent/20" : "bg-bg-secondary border-border"}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`${accent ? "text-accent-text" : "text-text-muted"}`}>{icon}</div>
        <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
      </div>
      <p className={`font-mono text-2xl font-bold ${accent ? "text-accent-text" : "text-text-primary"}`}>
        {value}
        {streak !== undefined && streak >= 7 && (
          <Flame size={16} className="inline ml-1 text-amber-400" style={{ verticalAlign: "text-top" }} />
        )}
      </p>
      {sub && <p className="text-[10px] text-text-muted mt-1">{sub}</p>}
    </div>
  );
}
