"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  Home, CalendarDays, Inbox, ListTodo, BarChart3, Timer, Focus,
  Settings2, FolderKanban, Wrench, Archive, LogOut, User, Shield, Library, Cake, X,
} from "lucide-react";
import TayronaLogo from "@/components/TayronaLogo";

const GOLD = "#e7ca79";

const MAIN_NAV = [
  { href: "/home",       label: "Home",               icon: Home },
  { href: "/",           label: "Today",               icon: CalendarDays },
  { href: "/inbox",      label: "Inbox",               icon: Inbox },
  { href: "/tasks",      label: "Tasks",               icon: ListTodo },
  { href: "/projects",   label: "Projects",             icon: FolderKanban },
  { href: "/tools",      label: "Tools",               icon: Wrench },
  { href: "/vault",      label: "La Bóveda",            icon: Library },
  { href: "/deepwork",   label: "Focus",               icon: Focus },
  { href: "/stats",      label: "Stats",               icon: BarChart3 },
  { href: "/timer",      label: "Timer",               icon: Timer },
  { href: "/backlog",    label: "Backlog",              icon: Archive },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [ancestralEnabled, setAncestralEnabled] = useState(true);
  const [todayBirthdays, setTodayBirthdays] = useState<string[]>([]);
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    const enabled = localStorage.getItem("ancestral-connections-enabled") !== "false";
    setAncestralEnabled(enabled);
    if (!enabled) return;
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayKey = `${mm}-${dd}`;
    const dismissKey = `birthday-banner-dismissed-${today.getFullYear()}-${todayKey}`;
    if (localStorage.getItem(dismissKey)) return;
    fetch("/api/birthdays")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const names = data.filter((b: { date: string; name: string }) => b.date === todayKey).map((b: { name: string }) => b.name);
          if (names.length > 0) { setTodayBirthdays(names); setBannerVisible(true); }
        }
      })
      .catch(() => {});
  }, []);

  const dismissBanner = () => {
    setBannerVisible(false);
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    localStorage.setItem(`birthday-banner-dismissed-${today.getFullYear()}-${mm}-${dd}`, "1");
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  return (
    <>
      <style jsx global>{`
        @keyframes profileDropdownIn {
          from { opacity: 0; transform: translateY(4px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)  scale(1);    }
        }
        @keyframes bannerSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Birthday banner (fixed, full-width) ── */}
      {bannerVisible && todayBirthdays.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-4 px-5 py-2.5"
          style={{
            background: `linear-gradient(135deg,rgba(231,202,121,0.18),rgba(196,169,79,0.12))`,
            borderBottom: `1px solid ${GOLD}30`,
            backdropFilter: "blur(12px)",
            animation: "bannerSlideDown 300ms ease-out",
          }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg flex-shrink-0">🎂</span>
            <p className="text-sm font-semibold truncate" style={{ color: GOLD }}>
              Hoy celebramos el ciclo de {todayBirthdays.join(" y ")}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/birthdays" onClick={dismissBanner}
              className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors hover:opacity-80"
              style={{ background: `${GOLD}20`, color: GOLD }}>
              Ver →
            </Link>
            <button onClick={dismissBanner}
              className="p-1 rounded-lg hover:bg-black/20 text-yellow-300/70 transition-colors">
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 bg-bg-sidebar border-r border-border min-h-screen fixed left-0 top-0 z-40">

        {/* Logo */}
        <div className="px-5 py-4">
          <Link href="/home" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tayrona-icon.png" alt="Tayrona" width={32} height={32} style={{ objectFit: "contain" }} />
            <span className="font-heading font-bold text-base tracking-tight text-text-primary">Tayrona AI</span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
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

          {/* Ancestral Connections — shown only when enabled */}
          {ancestralEnabled && (() => {
            const isActive = pathname.startsWith("/birthdays");
            return (
              <Link href="/birthdays"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-[13px] font-medium ${
                  isActive ? "bg-accent-subtle text-accent-text" : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}>
                <Cake size={18} strokeWidth={isActive ? 2 : 1.5} style={isActive ? {} : { color: GOLD, opacity: 0.8 }} />
                <span>Birthdays</span>
                {todayBirthdays.length > 0 && (
                  <span className="ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ background: GOLD }} />
                )}
              </Link>
            );
          })()}
        </nav>

        {/* Bottom: profile */}
        <div className="px-3 pb-4 border-t border-border pt-3 mt-2 space-y-1">

          {/* Profile dropdown */}
          {session?.user && (
            <div className="relative" ref={profileRef}>
              {profileOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 mx-1 rounded-lg border border-border bg-bg-elevated shadow-lg shadow-black/30 overflow-hidden"
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

              {/* User avatar button */}
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

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-sidebar border-t border-border z-50">
        <div className="flex justify-around items-center py-1.5 px-1">
          {[...MAIN_NAV.slice(0, 5), { href: "/profile", label: "Profile", icon: User }].map((item) => {
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
