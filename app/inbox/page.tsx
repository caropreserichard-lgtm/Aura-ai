"use client";

import { useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import InboxParser from "@/components/InboxParser";
import { Category } from "@/lib/types";

export default function InboxPage() {
  const handleCreateTasks = useCallback(
    async (
      tasks: {
        title: string;
        category: Category;
        subcategory: string;
        roi: number;
        joy: number;
        url: string | null;
      }[]
    ) => {
      for (const task of tasks) {
        try {
          await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: task.title,
              category: task.category,
              subcategory: task.subcategory,
              priority: 2,
              roi: task.roi,
              joy: task.joy,
              sourceUrl: task.url,
            }),
          });
        } catch (error) {
          console.error("Error creating task:", error);
        }
      }
      alert(`${tasks.length} tarea${tasks.length !== 1 ? "s" : ""} creada${tasks.length !== 1 ? "s" : ""}`);
    },
    []
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-20 lg:ml-56">
        <TopBar onAddTask={() => {}} />
        <div className="p-4 md:p-6 pb-24 md:pb-6">
          <InboxParser onCreateTasks={handleCreateTasks} />
        </div>
      </main>
    </div>
  );
}
