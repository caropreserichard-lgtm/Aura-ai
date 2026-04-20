"use client";

import React from "react";
import { Plus, Search, Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface TopBarProps {
  onAddTask?: () => void;
  hideAdd?: boolean;
  leftContent?: React.ReactNode;
}

export default function TopBar({ onAddTask, hideAdd, leftContent }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-bg-secondary/80 backdrop-blur-sm border-b border-border sticky top-0 z-30">
      {leftContent ?? <h2 className="md:hidden font-heading font-bold text-base text-text-primary">Ricky Flow</h2>}
      <div className="hidden md:block" />
      <div className="flex items-center gap-1.5">
        <button className="p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-secondary transition-colors">
          <Search size={18} />
        </button>
        <button onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-secondary transition-colors"
          title={theme === "dark" ? "Light mode" : "Dark mode"}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {!hideAdd && (
          <button onClick={onAddTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-text-inverse font-medium text-sm transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">New Task</span>
          </button>
        )}
      </div>
    </header>
  );
}
