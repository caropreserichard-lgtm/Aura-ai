"use client";

import { useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import confetti from "canvas-confetti";
import { Task, TaskStatus } from "@/lib/types";
import KanbanCard from "./KanbanCard";

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onEditTask: (task: Task) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "pending", label: "Pendiente", color: "border-accent-amber/50" },
  { id: "in_progress", label: "En Progreso", color: "border-accent-blue/50" },
  { id: "done", label: "Hecho", color: "border-accent-emerald/50" },
];

export default function KanbanBoard({
  tasks,
  onStatusChange,
  onEditTask,
}: KanbanBoardProps) {
  const tasksByStatus = (status: TaskStatus) =>
    tasks
      .filter((t) => t.status === status)
      .sort((a, b) => b.flowScore - a.flowScore);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { draggableId, destination, source } = result;

      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;

      const newStatus = destination.droppableId as TaskStatus;

      // Confetti when completing
      if (newStatus === "done") {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.5 },
          colors: ["#8B5CF6", "#EC4899"],
        });
      }

      await onStatusChange(draggableId, newStatus);
    },
    [onStatusChange]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {COLUMNS.map((col) => {
          const columnTasks = tasksByStatus(col.id);

          return (
            <div
              key={col.id}
              className="flex-1 min-w-[280px]"
            >
              {/* Column header */}
              <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${col.color}`}>
                <h3 className="font-heading font-bold text-sm text-text-secondary">
                  {col.label}
                </h3>
                <span className="text-xs text-text-muted bg-white/5 px-1.5 py-0.5 rounded-full font-mono">
                  {columnTasks.length}
                </span>
              </div>

              {/* Droppable area */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[200px] p-2 rounded-xl transition-colors duration-200 ${
                      snapshot.isDraggingOver
                        ? "bg-accent-purple/5 border border-dashed border-accent-purple/30"
                        : "bg-transparent"
                    }`}
                  >
                    {columnTasks.map((task, index) => (
                      <KanbanCard
                        key={task._id}
                        task={task}
                        index={index}
                        onClick={onEditTask}
                      />
                    ))}
                    {provided.placeholder}
                    {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                      <p className="text-center text-text-muted text-xs py-8 opacity-50">
                        Arrastra tareas aquí
                      </p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
