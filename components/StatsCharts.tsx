"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { Task, CATEGORIES, Category } from "@/lib/types";
import { formatTime } from "@/lib/scoring";

interface StatsChartsProps {
  tasks: Task[];
}

export default function StatsCharts({ tasks }: StatsChartsProps) {
  // Tasks by category
  const categoryData = (Object.keys(CATEGORIES) as Category[]).map((cat) => {
    const catTasks = tasks.filter((t) => t.category === cat);
    const done = catTasks.filter((t) => t.status === "done").length;
    const pending = catTasks.filter((t) => t.status !== "done").length;
    return {
      name: CATEGORIES[cat].label,
      icon: CATEGORIES[cat].icon,
      completadas: done,
      pendientes: pending,
      total: catTasks.length,
      color: CATEGORIES[cat].color,
    };
  });

  // Time by category (in minutes)
  const timeData = (Object.keys(CATEGORIES) as Category[]).map((cat) => {
    const totalSeconds = tasks
      .filter((t) => t.category === cat)
      .reduce((sum, t) => sum + (t.timeSpent || 0), 0);
    return {
      name: CATEGORIES[cat].label,
      minutos: Math.round(totalSeconds / 60),
      color: CATEGORIES[cat].color,
    };
  }).filter((d) => d.minutos > 0);

  // Pie data for distribution
  const pieData = categoryData
    .filter((d) => d.total > 0)
    .map((d) => ({
      name: d.name,
      value: d.total,
      color: d.color,
    }));

  // XP over time (by completion date)
  const xpByDate: Record<string, number> = {};
  tasks
    .filter((t) => t.status === "done" && t.completedAt)
    .forEach((t) => {
      const date = t.completedAt!.split("T")[0];
      xpByDate[date] = (xpByDate[date] || 0) + t.xp;
    });

  const xpTimeline = Object.entries(xpByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, xp]) => ({
      date: date.slice(5), // MM-DD
      xp,
    }));

  // Accumulate XP
  let accumulatedXP = 0;
  const xpAccumulated = xpTimeline.map((d) => {
    accumulatedXP += d.xp;
    return { ...d, total: accumulatedXP };
  });

  // Activity heatmap (tasks completed by day)
  const activityByDate: Record<string, number> = {};
  tasks
    .filter((t) => t.status === "done" && t.completedAt)
    .forEach((t) => {
      const date = t.completedAt!.split("T")[0];
      activityByDate[date] = (activityByDate[date] || 0) + 1;
    });

  // Summary stats
  const totalDone = tasks.filter((t) => t.status === "done").length;
  const totalXP = tasks
    .filter((t) => t.status === "done")
    .reduce((sum, t) => sum + t.xp, 0);
  const totalTime = tasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0);
  const avgFlowScore =
    tasks.length > 0
      ? Math.round(tasks.reduce((sum, t) => sum + t.flowScore, 0) / tasks.length)
      : 0;

  // Balance score
  const categoryCount = (Object.keys(CATEGORIES) as Category[]).map(
    (cat) => tasks.filter((t) => t.category === cat).length
  );
  const maxCount = Math.max(...categoryCount, 1);
  const minCount = Math.min(...categoryCount);
  const balanceScore = maxCount > 0 ? Math.round((minCount / maxCount) * 100) : 0;

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl bg-bg-secondary border border-white/5">
        <p className="text-4xl mb-3">{"📊"}</p>
        <p className="text-text-secondary">
          Completa algunas tareas para ver tus estadísticas
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Completadas" value={totalDone.toString()} color="text-accent-purple" />
        <StatCard label="XP Total" value={totalXP.toLocaleString()} color="text-accent-pink" />
        <StatCard label="Tiempo total" value={formatTime(totalTime)} color="text-accent-emerald" />
        <StatCard label="Flow promedio" value={avgFlowScore.toString()} color="text-accent-amber" />
        <StatCard label="Balance" value={`${balanceScore}%`} color="text-accent-blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by category bar chart */}
        <div className="rounded-xl bg-bg-secondary border border-white/5 p-5">
          <h3 className="font-heading font-bold text-sm text-text-secondary mb-4">
            Tareas por categoría
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData}>
              <XAxis
                dataKey="name"
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6B7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1A1A2E",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#F3F4F6",
                }}
              />
              <Bar dataKey="completadas" stackId="a" fill="#8B5CF6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="pendientes" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution pie */}
        <div className="rounded-xl bg-bg-secondary border border-white/5 p-5">
          <h3 className="font-heading font-bold text-sm text-text-secondary mb-4">
            Distribución de tareas
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                  label={(props: any) =>
                    `${props.name} ${(props.percent * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1A1A2E",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#F3F4F6",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-muted text-sm text-center py-8">Sin datos</p>
          )}
        </div>

        {/* XP timeline */}
        {xpAccumulated.length > 0 && (
          <div className="rounded-xl bg-bg-secondary border border-white/5 p-5">
            <h3 className="font-heading font-bold text-sm text-text-secondary mb-4">
              XP acumulado
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={xpAccumulated}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1A1A2E",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#F3F4F6",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ fill: "#EC4899", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Time by category */}
        {timeData.length > 0 && (
          <div className="rounded-xl bg-bg-secondary border border-white/5 p-5">
            <h3 className="font-heading font-bold text-sm text-text-secondary mb-4">
              Tiempo invertido (minutos)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timeData} layout="vertical">
                <XAxis
                  type="number"
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1A1A2E",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#F3F4F6",
                  }}
                />
                <Bar dataKey="minutos" radius={[0, 4, 4, 0]}>
                  {timeData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-bg-secondary border border-white/5 text-center">
      <p className={`font-mono text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </div>
  );
}
