import { Task, Category, CATEGORIES } from "./types";

export function calculateFlowScore(roi: number, joy: number): number {
  return Math.round((roi * 0.6 + joy * 0.4) * 10);
}

export function calculateXP(flowScore: number, category: Category): number {
  const multiplier = CATEGORIES[category]?.xpMultiplier || 1;
  return Math.round(flowScore * multiplier * 0.5);
}

export function getLevel(totalXP: number): {
  level: number;
  progress: number;
  xpInLevel: number;
  xpToNext: number;
} {
  const level = Math.floor(totalXP / 500) + 1;
  const xpInLevel = totalXP % 500;
  const xpToNext = 500 - xpInLevel;
  const progress = xpInLevel / 500;
  return { level, progress, xpInLevel, xpToNext };
}

export function sortTasksForToday(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.flowScore - a.flowScore;
    });
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export function formatTimeCompact(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
