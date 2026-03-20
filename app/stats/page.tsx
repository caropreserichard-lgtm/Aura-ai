"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import StatsCharts from "@/components/StatsCharts";
import { Task } from "@/lib/types";

export default function StatsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-20 lg:ml-56">
        <TopBar onAddTask={() => {}} />
        <div className="p-4 md:p-6 pb-24 md:pb-6">
          <h1 className="font-heading font-bold text-xl mb-6">Estadísticas</h1>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-xl bg-bg-secondary border border-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <StatsCharts tasks={tasks} />
          )}
        </div>
      </main>
    </div>
  );
}
