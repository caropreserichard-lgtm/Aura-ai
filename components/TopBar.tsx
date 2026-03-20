"use client";

import { Plus, Search } from "lucide-react";

interface TopBarProps {
  onAddTask: () => void;
}

export default function TopBar({ onAddTask }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-bg-secondary/50 backdrop-blur-sm border-b border-white/5 sticky top-0 z-30">
      <h2 className="md:hidden font-heading font-extrabold text-lg">
        <span className="text-accent-purple">RICKY</span>{" "}
        <span className="text-accent-pink">FLOW</span>
      </h2>

      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors">
          <Search size={20} />
        </button>
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-purple hover:bg-accent-purple/80 text-white font-medium text-sm transition-colors"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nueva Tarea</span>
        </button>
      </div>
    </header>
  );
}
