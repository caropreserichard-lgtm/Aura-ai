"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Home, CalendarDays, Inbox, ListTodo, BarChart3, Timer, Focus, Settings, Settings2, ClipboardCheck, FolderKanban, Wrench, Archive, LogOut, User, Shield } from "lucide-react";
import TayronaLogo from "@/components/TayronaLogo";
import { useLanguage } from "@/lib/LanguageContext";

const MAIN_NAV = [
  { href: "/home", labelKey: "nav.home", icon: Home },
  { href: "/", labelKey: "nav.today", icon: CalendarDays },
  { href: "/inbox", labelKey: "nav.inbox", icon: Inbox },
  { href: "/tasks", labelKey: "nav.tasks", icon: ListTodo },
  { href: "/projects", labelKey: "nav.projects", icon: FolderKanban },
  { href: "/tools", labelKey: "nav.tools", icon: Wrench },
  { href: "/deepwork", labelKey: "nav.focus", icon: Focus },
  { href: "/stats", labelKey: "nav.stats", icon: BarChart3 },
  { href: "/weekly-review", labelKey: "nav.weekly_review", icon: ClipboardCheck },
  { href: "/timer", labelKey: "nav.timer", icon: Timer },
  { href: "/backlog", labelKey: "nav.backlog", icon: Archive },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  return (
    <>
      <style jsx global>{`
        @keyframes profileDropdownIn {
          from { opacity: 0; transform: translateY(4px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <aside className="hidden md:flex flex-col w-60 bg-bg-sidebar border-r border-border min-h-screen fixed left-0 top-0 z-40">
        <div className="px-5 py-4">
          <Link href="/home" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tayrona-icon.png" alt="Tayrona" width={32} height={32} style={{ objectFit: "contain" }} />
            <span className="font-heading font-bold text-base tracking-tight text-text-primary">Tayrona AI</span>
          </Link>
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
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-4 border-t border-border pt-3 mt-2 space-y-1">
          <Link href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-[13px] font-medium ${
              pathname === "/settings" ? "bg-accent-subtle text-accent-text" : "text-text-muted hover:bg-bg-hover hover:text-text-secondary"
            }`}>
            <Settings size={18} strokeWidth={1.5} />
            <span>{t("nav.settings")}</span>
          </Link>
          {session?.user && (
            <div className="relative" ref={profileRef}>
              {/* Dropdown menu - appears above */}
              {profileOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 mx-1 rounded-lg border border-border bg-bg-elevated shadow-lg shadow-black/30 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
                  style={{ animation: "profileDropdownIn 150ms ease-out" }}>
                  <div className="py-1">
                    <Link href="/profile" onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
                      <User size={15} strokeWidth={1.5} />
                      <span>Mi Perfil</span>
                    </Link>
                    <Link href="/profile?tab=account" onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
                      <Shield size={15} strokeWidth={1.5} />
                      <span>Cuenta</span>
                    </Link>
                    <Link href="/profile?tab=general" onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
                      <Settings2 size={15} strokeWidth={1.5} />
                      <span>General</span>
                    </Link>
                    <div className="my-1 border-t border-border" />
                    <button onClick={() => { setProfileOpen(false); signOut({ callbackUrl: "/login" }); }}
                      className="flex items-center gap-3 px-3 py-2 w-full text-[13px] text-red-400 hover:bg-bg-hover transition-colors">
                      <LogOut size={15} strokeWidth={1.5} />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </div>
              )}
              {/* User info button */}
              <button onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2.5 px-3 py-2 mt-1 w-full rounded-lg hover:bg-bg-hover transition-colors cursor-pointer">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #e7ca79, #c4a94f)" }}>
                  {session.user.name?.[0]?.toUpperCase() || <User size={12} />}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[11px] font-medium text-text-primary truncate">{session.user.name}</p>
                  <p className="text-[9px] text-text-muted truncate">{session.user.email}</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-sidebar border-t border-border z-50">
        <div className="flex justify-around items-center py-1.5 px-1">
          {[...MAIN_NAV.slice(0, 5), { href: "/settings", labelKey: "nav.settings", icon: Settings }].map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors text-[10px] ${
                  isActive ? "text-accent-text" : "text-text-muted"
                }`}>
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
