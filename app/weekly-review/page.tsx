"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Task, CATEGORIES, Category } from "@/lib/types";
import { formatTime } from "@/lib/scoring";

const CAT_COLORS: Record<string, string> = {
  trabajo: "#e7ca79",
  aprendizaje: "#8b7ec8",
  lifestyle: "#4a9e7e",
  proyectos: "#6b8aaf",
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

function toDateKey(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function WeeklyReviewPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(-1); // Default to last week

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const weekDates = getWeekDates(weekOffset);
  const weekKeys = weekDates.map(toDateKey);

  // Completed tasks this week (by completedAt)
  const weekCompleted = tasks.filter((t) => {
    if (!t.completedAt) return false;
    const completedDate = t.completedAt.split("T")[0];
    return completedDate >= weekKeys[0] && completedDate <= weekKeys[6];
  });

  // Group completed by day
  const completedByDay: Record<string, Task[]> = {};
  weekDates.forEach((d) => { completedByDay[toDateKey(d)] = []; });
  weekCompleted.forEach((t) => {
    const day = t.completedAt!.split("T")[0];
    if (completedByDay[day]) completedByDay[day].push(t);
  });

  // Total hours
  const totalSeconds = weekCompleted.reduce((s, t) => s + (t.timeSpent || 0), 0);
  const totalHours = Math.round(totalSeconds / 3600 * 10) / 10;

  // Daily productivity chart data
  const dailyData = weekDates.map((d, i) => {
    const key = toDateKey(d);
    const dayTasks = completedByDay[key] || [];
    const hours = Math.round(dayTasks.reduce((s, t) => s + (t.timeSpent || 0), 0) / 3600 * 10) / 10;
    return { name: DAYS_SHORT[i], hours, tasks: dayTasks.length };
  });

  // Time by subcategory for donut chart
  const subTime: Record<string, { time: number; category: string }> = {};
  weekCompleted.forEach((t) => {
    const key = t.subcategory || "Other";
    if (!subTime[key]) subTime[key] = { time: 0, category: t.category };
    subTime[key].time += t.timeSpent || 0;
  });
  const donutData = Object.entries(subTime)
    .map(([name, { time, category }]) => ({
      name,
      minutes: Math.round(time / 60),
      color: CAT_COLORS[category] || "#666",
    }))
    .filter((d) => d.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const weekLabel = weekOffset === 0
    ? "This week"
    : weekOffset === -1
    ? "Last week"
    : `${weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const dateRange = `${weekDates[0].toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${weekDates[6].toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar onAddTask={() => {}} />

        <div className="p-4 md:p-6 pb-24 md:pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-heading font-bold text-xl">{weekLabel}</h1>
              <p className="text-[13px] text-text-muted">{dateRange}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekOffset((w) => w - 1)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setWeekOffset(-1)} className="px-3 py-1 rounded-lg text-[12px] font-medium hover:bg-bg-hover text-text-secondary transition-colors">
                Last week
              </button>
              <button onClick={() => setWeekOffset((w) => w + 1)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: What got done summary */}
            <div className="space-y-5">
              <div>
                <h2 className="font-heading font-semibold text-base mb-1">What got done</h2>
                <p className="text-[13px] text-text-muted">
                  You logged <span className="text-text-primary font-semibold">{totalHours} hours</span> this week in total
                </p>
                <p className="text-[13px] text-text-muted">
                  <span className="text-text-primary font-semibold">{weekCompleted.length}</span> tasks completed
                </p>
              </div>

              {/* Daily productivity bar chart */}
              <div>
                <h3 className="text-[12px] text-text-secondary font-semibold mb-2">Daily productivity</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} width={25} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#242424", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "11px" }}
                        formatter={(value) => [`${value}h`, "Hours"]}
                      />
                      <Bar dataKey="hours" fill="#4a9e7e" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Time distribution donut */}
              {donutData.length > 0 && (
                <div>
                  <h3 className="text-[12px] text-text-secondary font-semibold mb-2">How you spent your time</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} dataKey="minutes" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                          {donutData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "#242424", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "11px" }}
                          formatter={(value) => [`${value} min`, ""]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {donutData.map((d) => (
                      <span key={d.name} className="flex items-center gap-1 text-[10px] text-text-muted">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Day-by-day breakdown */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
                {weekDates.map((date, i) => {
                  const key = toDateKey(date);
                  const dayTasks = completedByDay[key] || [];
                  const dayTime = dayTasks.reduce((s, t) => s + (t.timeSpent || 0), 0);

                  return (
                    <div key={key} className="rounded-lg border border-border bg-bg-secondary p-3 min-h-[200px]">
                      <div className="mb-2">
                        <p className="text-[12px] font-semibold text-text-primary">{DAYS[i]}</p>
                        <p className="text-[11px] text-text-muted">
                          {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                        {dayTime > 0 && (
                          <p className="text-[10px] text-accent font-mono mt-0.5">{formatTime(dayTime)}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        {dayTasks.map((task) => {
                          const color = CAT_COLORS[task.category] || "#666";
                          return (
                            <div key={task._id} className="flex items-start gap-1.5">
                              <div className="w-3.5 h-3.5 rounded-full bg-accent flex-shrink-0 flex items-center justify-center mt-0.5">
                                <Check size={8} className="text-text-inverse" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-text-secondary leading-tight truncate">{task.title}</p>
                                {task.timeSpent > 0 && (
                                  <span className="text-[9px] text-text-muted font-mono">{formatTime(task.timeSpent)}</span>
                                )}
                                <span className="text-[9px] font-medium ml-1" style={{ color }}>
                                  # {task.subcategory}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {dayTasks.length === 0 && (
                          <p className="text-[10px] text-text-muted italic">No tasks</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
