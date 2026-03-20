"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Inbox,
  ListTodo,
  BarChart3,
  Timer,
  Focus,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Hoy", icon: LayoutDashboard, emoji: "\uD83D\uDCCA" },
  { href: "/inbox", label: "Inbox", icon: Inbox, emoji: "\uD83D\uDCE5" },
  { href: "/tasks", label: "Tasks", icon: ListTodo, emoji: "\uD83D\uDCCB" },
  { href: "/deepwork", label: "Deep Work", icon: Focus, emoji: "\uD83C\uDFAF" },
  { href: "/stats", label: "Stats", icon: BarChart3, emoji: "\uD83D\uDCC8" },
  { href: "/timer", label: "Timer", icon: Timer, emoji: "\u23F1\uFE0F" },
  { href: "/settings", label: "Config", icon: Settings, emoji: "\u2699\uFE0F" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-20 lg:w-56 bg-bg-secondary border-r border-white/5 min-h-screen fixed left-0 top-0 z-40">
        <div className="p-4 lg:p-6">
          <h1 className="hidden lg:block font-heading font-extrabold text-xl tracking-tight">
            <span className="text-accent-purple">RICKY</span>{" "}
            <span className="text-accent-pink">FLOW</span>
          </h1>
          <h1 className="lg:hidden font-heading font-extrabold text-lg text-center">
            <span className="text-accent-purple">R</span>
            <span className="text-accent-pink">F</span>
          </h1>
        </div>

        <nav className="flex-1 px-2 lg:px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium
                  ${
                    isActive
                      ? "bg-accent-purple/15 text-accent-purple"
                      : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                  }`}
              >
                <Icon size={20} />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-white/5 z-50">
        <div className="flex justify-around items-center py-2 px-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all text-xs
                  ${
                    isActive
                      ? "text-accent-purple"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
