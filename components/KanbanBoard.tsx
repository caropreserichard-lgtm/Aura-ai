"use client";

import { useCallback } from "react";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import confetti from "canvas-confetti";
import { Task, TaskStatus } from "@/lib/types";
import KanbanCard from "./KanbanCard";

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onEditTask: (task: Task) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "pending", label: "Pending", color: "border-warning" },
  { id: "in_progress", label: "In Progress", color: "border-secondary" },
  { id: "done", label: "Done", color: "border-accent" },
];

export default function KanbanBoard({ tasks, onStatusChange, onEditTask }: KanbanBoardProps) {
  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status).sort((a, b) => b.flowScore - a.flowScore);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { draggableId, destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const newStatus = destination.droppableId as TaskStatus;
    if (newStatus === "done") confetti({ particleCount: 20, spread: 40, origin: { y: 0.5 }, colors: ["#4a9e7e", "#6b8aaf"] });
    await onStatusChange(draggableId, newStatus);
  }, [onStatusChange]);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const columnTasks = tasksByStatus(col.id);
          return (
            <div key={col.id} className="flex-1 min-w-[260px]">
              <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${col.color}`}>
                <h3 className="font-heading font-semibold text-[13px] text-text-secondary">{col.label}</h3>
                <span className="text-[11px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded-full font-mono">{columnTasks.length}</span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className={`space-y-1.5 min-h-[200px] p-1.5 rounded-lg transition-colors duration-200 ${
                      snapshot.isDraggingOver ? "bg-accent-subtle border border-dashed border-accent/30" : ""
                    }`}>
                    {columnTasks.map((task, index) => (
                      <KanbanCard key={task._id} task={task} index={index} onClick={onEditTask} />
                    ))}
                    {provided.placeholder}
                    {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                      <p className="text-center text-text-muted text-[11px] py-8 opacity-50">Drag tasks here</p>
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
