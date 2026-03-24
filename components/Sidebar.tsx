"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, CalendarDays, Inbox, ListTodo, BarChart3, Timer, Focus, Settings, ClipboardCheck, FolderKanban, Wrench } from "lucide-react";

const MAIN_NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/", label: "Today", icon: CalendarDays },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/deepwork", label: "Focus", icon: Focus },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/weekly-review", label: "Weekly Review", icon: ClipboardCheck },
  { href: "/timer", label: "Timer", icon: Timer },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden md:flex flex-col w-60 bg-bg-sidebar border-r border-border min-h-screen fixed left-0 top-0 z-40">
        <div className="px-5 py-5">
          <h1 className="font-heading font-bold text-base tracking-tight text-text-primary">
            Ricky Flow
          </h1>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {MAIN_NAV.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-[13px] font-medium ${
                  isActive ? "bg-accent-subtle text-accent-text" : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}>
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-4 border-t border-border pt-3 mt-2">
          <Link href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-[13px] font-medium ${
              pathname === "/settings" ? "bg-accent-subtle text-accent-text" : "text-text-muted hover:bg-bg-hover hover:text-text-secondary"
            }`}>
            <Settings size={18} strokeWidth={1.5} />
            <span>Settings</span>
          </Link>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-sidebar border-t border-border z-50">
        <div className="flex justify-around items-center py-1.5 px-1">
          {[...MAIN_NAV.slice(0, 5), { href: "/settings", label: "Settings", icon: Settings }].map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors text-[10px] ${
                  isActive ? "text-accent-text" : "text-text-muted"
                }`}>
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
