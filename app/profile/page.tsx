"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import SubcategoriesManager from "@/components/SubcategoriesManager";
import {
  User, Mail, Crown, Save, ArrowLeft, Check, Camera, Lock,
  Download, LogOut, Trash2, Globe, Clock, Calendar, Languages,
  Timer, AlertTriangle, X, Eye, EyeOff, Shield,
  Link2, Unlink, RefreshCw, CheckCircle2, AlertCircle,
  FolderKanban, Ban,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

type TabKey = "profile" | "account" | "general";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  empireName: string;
  avatarUrl: string | null;
  preferences: {
    timezone: string;
    timeFormat: string;
    startOfWeek: string;
    language: string;
    countPlannedAsActual: boolean;
    notToDoMode: boolean;
  };
}

const TABS: { key: TabKey; label: string; icon: typeof User }[] = [
  { key: "profile", label: "Profile",  icon: User   },
  { key: "account", label: "Account",  icon: Shield  },
  { key: "general", label: "General",  icon: Globe   },
];

const TIMEZONES = [
  "America/Bogota","America/New_York","America/Chicago","America/Denver",
  "America/Los_Angeles","America/Mexico_City","America/Lima","America/Buenos_Aires",
  "America/Sao_Paulo","America/Santiago","Europe/London","Europe/Paris",
  "Europe/Berlin","Europe/Madrid","Asia/Tokyo","Asia/Shanghai",
  "Asia/Dubai","Asia/Kolkata","Australia/Sydney","Pacific/Auckland",
];

/* ─────────────────────────────────────────────────────────────
   Inner component (uses useSearchParams → needs Suspense wrapper)
   ───────────────────────────────────────────────────────────── */
function ProfileContent() {
  const searchParams   = useSearchParams();
  const { data: session, update } = useSession();
  const router         = useRouter();
  const fileInputRef   = useRef<HTMLInputElement>(null);

  // Derive initial tab from ?tab= param
  const tabParam = searchParams.get("tab") as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam ?? "profile");

  const [loading, setLoading] = useState(true);

  // ── Profile state ──
  const [firstName,       setFirstName]       = useState("");
  const [lastName,        setLastName]        = useState("");
  const [empireName,      setEmpireName]      = useState("");
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadError,     setUploadError]     = useState<string | null>(null);
  const [profileSaving,   setProfileSaving]   = useState(false);
  const [profileSaved,    setProfileSaved]    = useState(false);

  // ── Account state ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [showCurrentPw,   setShowCurrentPw]   = useState(false);
  const [showNewPw,       setShowNewPw]       = useState(false);
  const [passwordSaving,  setPasswordSaving]  = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newEmail,        setNewEmail]        = useState("");
  const [emailSaving,     setEmailSaving]     = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [exporting,       setExporting]       = useState(false);
  const [showDeleteModal,      setShowDeleteModal]      = useState(false);
  const [deleteConfirmText,    setDeleteConfirmText]    = useState("");
  const [deleting,             setDeleting]             = useState(false);

  // ── General settings state ──
  const [timezone,              setTimezone]              = useState("America/Bogota");
  const [timeFormat,            setTimeFormat]            = useState("12h");
  const [startOfWeek,           setStartOfWeek]           = useState("monday");
  const [language,              setLanguage]              = useState("es");
  const [countPlannedAsActual,  setCountPlannedAsActual]  = useState(false);
  const [generalSaving,         setGeneralSaving]         = useState(false);
  const [generalSaved,          setGeneralSaved]          = useState(false);

  // ── Ancestral Connections feature flag (localStorage only) ──
  const [ancestralConnections, setAncestralConnections] = useState(true);
  useEffect(() => {
    setAncestralConnections(localStorage.getItem("ancestral-connections-enabled") !== "false");
  }, []);
  const toggleAncestralConnections = (enabled: boolean) => {
    setAncestralConnections(enabled);
    localStorage.setItem("ancestral-connections-enabled", enabled ? "true" : "false");
  };

  // ── Not-To-Do Mode (server-backed user preference) ──
  const [notToDoMode, setNotToDoMode] = useState(false);
  const toggleNotToDoMode = async (enabled: boolean) => {
    setNotToDoMode(enabled);
    window.dispatchEvent(new Event("not-to-do-mode-changed"));
    try {
      await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { notToDoMode: enabled } }),
      });
    } catch {}
  };

  // ── New project position (localStorage only) ──
  const [newProjectToBeginning, setNewProjectToBeginning] = useState(false);
  useEffect(() => {
    setNewProjectToBeginning(localStorage.getItem("project_add_position") === "beginning");
  }, []);
  const toggleProjectPosition = (toBeginning: boolean) => {
    setNewProjectToBeginning(toBeginning);
    localStorage.setItem("project_add_position", toBeginning ? "beginning" : "end");
  };

  // ── Google Calendar state ──
  const calendarSuccess = searchParams.get("success");
  const calendarError   = searchParams.get("error");
  const [calendarStatus,  setCalendarStatus]  = useState<{ connected: boolean; email?: string }>({ connected: false });
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [syncing,         setSyncing]         = useState(false);
  const [syncResult,      setSyncResult]      = useState<string | null>(null);

  // Load profile
  useEffect(() => {
    fetch("/api/auth/profile")
      .then((r) => r.json())
      .then((data: UserProfile) => {
        setFirstName(data.firstName || "");
        setLastName(data.lastName   || "");
        setEmpireName(data.empireName || "");
        setAvatarUrl(data.avatarUrl);
        if (data.preferences) {
          setTimezone(data.preferences.timezone            || "America/Bogota");
          setTimeFormat(data.preferences.timeFormat        || "12h");
          setStartOfWeek(data.preferences.startOfWeek     || "monday");
          setLanguage(data.preferences.language            || "es");
          setCountPlannedAsActual(data.preferences.countPlannedAsActual || false);
          setNotToDoMode(data.preferences.notToDoMode || false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load calendar status
  useEffect(() => {
    fetch("/api/calendar/status")
      .then((r) => r.json())
      .then(setCalendarStatus)
      .catch(() => setCalendarStatus({ connected: false }))
      .finally(() => setCalendarLoading(false));
  }, []);

  // ── Handlers ──
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Por favor selecciona un archivo de imagen válido.");
      return;
    }
    setUploadingAvatar(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Error al subir la imagen.");
        return;
      }
      if (data.url) {
        setAvatarUrl(data.url);
        await fetch("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarUrl: data.url }) });
        await update({ image: data.url });
      }
    } catch {
      setUploadError("Error de conexión al subir la imagen.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      await fetch("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName, lastName, empireName }) });
      await update({ name: [firstName, lastName].filter(Boolean).join(" ") });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch { /* silent */ }
    finally { setProfileSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setPasswordSaving(true); setPasswordMsg(null);
    try {
      const res  = await fetch("/api/auth/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await res.json();
      if (!res.ok) { setPasswordMsg({ type: "error",   text: data.error || "Failed to change password" }); }
      else         { setPasswordMsg({ type: "success", text: "Password updated successfully" }); setCurrentPassword(""); setNewPassword(""); }
    } catch { setPasswordMsg({ type: "error", text: "Failed to change password" }); }
    finally { setPasswordSaving(false); }
  };

  const handleChangeEmail = async () => {
    if (!newEmail) return;
    setEmailSaving(true); setEmailMsg(null);
    try {
      const res  = await fetch("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newEmail }) });
      const data = await res.json();
      if (!res.ok) { setEmailMsg({ type: "error",   text: data.error || "Failed to update email" }); }
      else         { setEmailMsg({ type: "success", text: "Email updated. Please sign in again." }); setNewEmail(""); }
    } catch { setEmailMsg({ type: "error", text: "Failed to update email" }); }
    finally { setEmailSaving(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res  = await fetch("/api/auth/export");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `tayrona-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
    finally { setExporting(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    try { await fetch("/api/auth/profile", { method: "DELETE" }); signOut({ callbackUrl: "/login" }); }
    catch { setDeleting(false); }
  };

  const { setLang } = useLanguage();
  const handleSaveGeneral = async () => {
    setGeneralSaving(true);
    try {
      await fetch("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferences: { timezone, timeFormat, startOfWeek, language, countPlannedAsActual } }) });
      setLang(language as "es" | "en");
      setGeneralSaved(true);
      setTimeout(() => setGeneralSaved(false), 2500);
    } catch { /* silent */ }
    finally { setGeneralSaving(false); }
  };

  const handleCalendarDisconnect = async () => {
    await fetch("/api/calendar/status", { method: "DELETE" });
    setCalendarStatus({ connected: false });
  };

  const handleCalendarSync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res  = await fetch("/api/calendar/sync", { method: "POST" });
      const data = await res.json();
      setSyncResult(data.error ? `Error: ${data.error}` : `Sincronizadas ${data.synced} de ${data.total} tareas con fecha`);
    } catch { setSyncResult("Error al sincronizar"); }
    finally { setSyncing(false); }
  };

  const sessionUser  = session?.user ?? null;
  const displayName  = [firstName, lastName].filter(Boolean).join(" ") || sessionUser?.name || "User";
  const initial      = firstName?.[0]?.toUpperCase() || sessionUser?.name?.[0]?.toUpperCase() || "T";

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 md:ml-60">
          <TopBar />
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-8 h-8 border-3 border-[#e7ca79]/30 border-t-[#e7ca79] rounded-full animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar
          leftContent={
            <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted">
              <ArrowLeft size={18} />
            </button>
          }
        />

        <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8">
          <h1 className="text-xl font-bold text-text-primary mb-6">Settings</h1>

          {/* Tab navigation */}
          <div className="flex gap-1 mb-6 bg-bg-secondary rounded-xl p-1 border border-border">
            {TABS.map((tab) => {
              const Icon     = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive ? "bg-bg-elevated text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
                  }`}
                  style={isActive ? { borderBottom: "2px solid #e7ca79" } : {}}>
                  <Icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ═══════════════ PROFILE TAB ═══════════════ */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {/* Avatar */}
              <div className="bg-bg-secondary rounded-xl border border-border p-6">
                <div className="flex items-center gap-5">
                  <div className="relative group">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2" style={{ borderColor: "#e7ca79" }} />
                    ) : (
                      <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white border-2"
                        style={{ background: "linear-gradient(135deg, #e7ca79, #c4a94f)", borderColor: "#e7ca79" }}>
                        {initial}
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-text-primary">{displayName}</p>
                    <p className="text-xs text-text-muted mb-3">{sessionUser?.email}</p>
                    <label
                      htmlFor="avatar-upload"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${uploadingAvatar ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      style={{ borderColor: "rgba(231,202,121,0.4)", color: "#e7ca79" }}
                    >
                      <Camera size={14} />
                      {uploadingAvatar ? "Subiendo..." : "Subir foto de perfil"}
                    </label>
                    {uploadError && (
                      <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>{uploadError}</p>
                    )}
                    <input
                      id="avatar-upload"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      disabled={uploadingAvatar}
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                </div>
              </div>

              {/* Name fields */}
              <div className="bg-bg-secondary rounded-xl border border-border p-6 space-y-4">
                <h3 className="text-sm font-semibold text-text-primary mb-1">Personal information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-text-muted uppercase tracking-wide mb-1.5 block">First name</label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name"
                      className="w-full px-3 py-2.5 rounded-lg bg-bg-primary border border-border text-sm text-text-primary focus:outline-none focus:border-[#e7ca79]/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted uppercase tracking-wide mb-1.5 block">Last name</label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name"
                      className="w-full px-3 py-2.5 rounded-lg bg-bg-primary border border-border text-sm text-text-primary focus:outline-none focus:border-[#e7ca79]/50 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input type="email" value={sessionUser?.email || ""} disabled
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-bg-tertiary border border-border text-sm text-text-muted cursor-not-allowed" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Crown size={12} style={{ color: "#e7ca79" }} /> Empire name
                  </label>
                  <input type="text" value={empireName} onChange={(e) => setEmpireName(e.target.value)} placeholder="My Empire"
                    className="w-full px-3 py-2.5 rounded-lg bg-bg-primary border text-sm text-text-primary focus:outline-none focus:border-[#e7ca79]/50 transition-colors"
                    style={{ borderColor: "rgba(231,202,121,0.3)" }} />
                </div>
              </div>

              <button onClick={handleSaveProfile} disabled={profileSaving}
                className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all text-white"
                style={{ background: profileSaved ? "#4a9e7e" : "linear-gradient(135deg, #e7ca79, #c4a94f)" }}>
                {profileSaved ? <><Check size={16} /> Saved</> : <><Save size={16} /> Save changes</>}
              </button>
            </div>
          )}

          {/* ═══════════════ ACCOUNT TAB ═══════════════ */}
          {activeTab === "account" && (
            <div className="space-y-6">
              {/* Password */}
              <div className="bg-bg-secondary rounded-xl border border-border p-6 space-y-4">
                <div className="flex items-center gap-3 mb-1">
                  <Lock size={18} className="text-text-muted" />
                  <h3 className="text-sm font-semibold text-text-primary">Set password</h3>
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide mb-1.5 block">Current password</label>
                  <div className="relative">
                    <input type={showCurrentPw ? "text" : "password"} value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password"
                      className="w-full px-3 py-2.5 pr-10 rounded-lg bg-bg-primary border border-border text-sm text-text-primary focus:outline-none focus:border-[#e7ca79]/50 transition-colors" />
                    <button onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                      {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide mb-1.5 block">New password</label>
                  <div className="relative">
                    <input type={showNewPw ? "text" : "password"} value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password (min 8 characters)"
                      className="w-full px-3 py-2.5 pr-10 rounded-lg bg-bg-primary border border-border text-sm text-text-primary focus:outline-none focus:border-[#e7ca79]/50 transition-colors" />
                    <button onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {passwordMsg && (
                  <p className={`text-xs ${passwordMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>{passwordMsg.text}</p>
                )}
                <button onClick={handleChangePassword} disabled={passwordSaving || !currentPassword || !newPassword || newPassword.length < 8}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                  style={{ background: "rgba(231,202,121,0.15)", color: "#e7ca79" }}>
                  {passwordSaving ? "Updating..." : "Update password"}
                </button>
              </div>

              <div className="border-t border-border" />

              {/* Email */}
              <div className="bg-bg-secondary rounded-xl border border-border p-6 space-y-4">
                <div className="flex items-center gap-3 mb-1">
                  <Mail size={18} className="text-text-muted" />
                  <h3 className="text-sm font-semibold text-text-primary">Change primary email</h3>
                </div>
                <p className="text-xs text-text-muted">Current email: <span className="text-text-secondary">{sessionUser?.email}</span></p>
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide mb-1.5 block">New email address</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@email.com"
                    className="w-full px-3 py-2.5 rounded-lg bg-bg-primary border border-border text-sm text-text-primary focus:outline-none focus:border-[#e7ca79]/50 transition-colors" />
                </div>
                {emailMsg && (
                  <p className={`text-xs ${emailMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>{emailMsg.text}</p>
                )}
                <button onClick={handleChangeEmail} disabled={emailSaving || !newEmail}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                  style={{ background: "rgba(231,202,121,0.15)", color: "#e7ca79" }}>
                  {emailSaving ? "Saving..." : "Save new email"}
                </button>
              </div>

              <div className="border-t border-border" />

              {/* Export */}
              <div className="bg-bg-secondary rounded-xl border border-border p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Download size={18} className="text-text-muted" />
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">Export my data</h3>
                      <p className="text-xs text-text-muted">Download all your tasks, projects, and stats as JSON</p>
                    </div>
                  </div>
                  <button onClick={handleExport} disabled={exporting}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: "rgba(231,202,121,0.15)", color: "#e7ca79" }}>
                    {exporting ? "Exporting..." : "Export"}
                  </button>
                </div>
              </div>

              {/* Logout */}
              <div className="bg-bg-secondary rounded-xl border border-border p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <LogOut size={18} className="text-text-muted" />
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">Log out all sessions</h3>
                      <p className="text-xs text-text-muted">Sign out from all devices and browsers</p>
                    </div>
                  </div>
                  <button onClick={() => signOut({ callbackUrl: "/login" })}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-bg-tertiary text-text-secondary hover:bg-bg-hover transition-colors">
                    Log out
                  </button>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Delete account */}
              <div className="bg-bg-secondary rounded-xl border border-red-500/20 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trash2 size={18} className="text-red-400" />
                    <div>
                      <h3 className="text-sm font-semibold text-red-400">Delete account</h3>
                      <p className="text-xs text-text-muted">Permanently delete your account and all data. Cannot be undone.</p>
                    </div>
                  </div>
                  <button onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ GENERAL TAB ═══════════════ */}
          {activeTab === "general" && (
            <div className="space-y-6">

              {/* Calendar success/error banners */}
              {calendarSuccess === "connected" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                  <CheckCircle2 size={16} /> Google Calendar conectado exitosamente
                </div>
              )}
              {calendarError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle size={16} /> Error al conectar: {calendarError.replace(/_/g, " ")}
                </div>
              )}

              {/* ── App preferences ── */}
              <div className="bg-bg-secondary rounded-xl border border-border p-6 space-y-5">
                <h3 className="text-sm font-semibold text-text-primary">Preferencias de la app</h3>

                {/* Timezone */}
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Globe size={12} /> Time zone
                  </label>
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-bg-primary border border-border text-sm text-text-primary focus:outline-none focus:border-[#e7ca79]/50 transition-colors appearance-none cursor-pointer">
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
                  </select>
                </div>

                <div className="border-t border-border" />

                {/* Time format */}
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Clock size={12} /> Time format
                  </label>
                  <div className="flex gap-2">
                    {[{ value: "12h", label: "12-hour (2:00 PM)" }, { value: "24h", label: "24-hour (14:00)" }].map((opt) => (
                      <button key={opt.value} onClick={() => setTimeFormat(opt.value)}
                        className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                          timeFormat === opt.value ? "border-[#e7ca79]/50 bg-[#e7ca79]/10 text-[#e7ca79]" : "border-border bg-bg-primary text-text-muted hover:text-text-secondary"
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Language */}
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Languages size={12} /> Preferred language
                  </label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-bg-primary border border-border text-sm text-text-primary focus:outline-none focus:border-[#e7ca79]/50 transition-colors appearance-none cursor-pointer">
                    <option value="es">Spanish</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div className="border-t border-border" />

                {/* Count planned as actual */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Timer size={16} className="text-text-muted" />
                    <div>
                      <p className="text-sm text-text-primary font-medium">Count planned time as actual</p>
                      <p className="text-xs text-text-muted">When enabled, planned task duration counts as actual time spent</p>
                    </div>
                  </div>
                  <button onClick={() => setCountPlannedAsActual(!countPlannedAsActual)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${countPlannedAsActual ? "bg-[#e7ca79]" : "bg-bg-tertiary border border-border"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${countPlannedAsActual ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                <div className="border-t border-border" />

                {/* Ancestral Connections */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-base">🎂</span>
                    <div>
                      <p className="text-sm text-text-primary font-medium">Ancestral Connections</p>
                      <p className="text-xs text-text-muted">Módulo de recordatorios de cumpleaños y ciclos de vida</p>
                    </div>
                  </div>
                  <button onClick={() => toggleAncestralConnections(!ancestralConnections)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${ancestralConnections ? "bg-[#e7ca79]" : "bg-bg-tertiary border border-border"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${ancestralConnections ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                <div className="border-t border-border" />

                {/* Not-To-Do Mode */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Ban size={16} className="text-text-muted" />
                    <div>
                      <p className="text-sm text-text-primary font-medium">Not-To-Do Mode</p>
                      <p className="text-xs text-text-muted">Activa el módulo &quot;The Forbidden Path&quot; para tu disciplina</p>
                    </div>
                  </div>
                  <button onClick={() => toggleNotToDoMode(!notToDoMode)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${notToDoMode ? "bg-[#e7ca79]" : "bg-bg-tertiary border border-border"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notToDoMode ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                <div className="border-t border-border" />

                {/* New project position */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderKanban size={16} className="text-text-muted" />
                    <div>
                      <p className="text-sm text-text-primary font-medium">Nuevos proyectos</p>
                      <p className="text-xs text-text-muted">Define si los proyectos nuevos aparecen al inicio o al final</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-lg bg-bg-tertiary border border-border p-0.5">
                    <button
                      onClick={() => toggleProjectPosition(true)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        newProjectToBeginning ? "bg-[#e7ca79] text-bg-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      Al inicio
                    </button>
                    <button
                      onClick={() => toggleProjectPosition(false)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        !newProjectToBeginning ? "bg-[#e7ca79] text-bg-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      Al final
                    </button>
                  </div>
                </div>
              </div>

              {/* Save preferences button */}
              <button onClick={handleSaveGeneral} disabled={generalSaving}
                className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all text-white"
                style={{ background: generalSaved ? "#4a9e7e" : "linear-gradient(135deg, #e7ca79, #c4a94f)" }}>
                {generalSaved ? <><Check size={16} /> Saved</> : <><Save size={16} /> Save settings</>}
              </button>

              {/* ── Subcategories ── */}
              <SubcategoriesManager />

              {/* ── Google Calendar ── */}
              <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-text-muted" />
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">Google Calendar</h3>
                      <p className="text-xs text-text-muted">Sincroniza tus tareas con Google Calendar</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {calendarLoading ? (
                    <div className="h-12 rounded-lg bg-bg-tertiary animate-pulse" />
                  ) : calendarStatus.connected ? (
                    <>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <div className="flex-1">
                          <p className="text-sm text-text-primary">Conectado</p>
                          <p className="text-xs text-text-muted">{calendarStatus.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleCalendarSync} disabled={syncing}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          style={{ background: "rgba(231,202,121,0.1)", color: "#e7ca79" }}>
                          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                          {syncing ? "Sincronizando..." : "Sincronizar ahora"}
                        </button>
                        <button onClick={handleCalendarDisconnect}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors">
                          <Unlink size={16} /> Desconectar
                        </button>
                      </div>
                      {syncResult && <p className="text-xs text-text-muted bg-bg-tertiary p-2 rounded-lg">{syncResult}</p>}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-text-muted">Conecta tu Google para sincronizar tareas con fecha a tu calendario automáticamente.</p>
                      <a href="/api/calendar/auth"
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium text-sm transition-colors border"
                        style={{ background: "rgba(231,202,121,0.08)", color: "#e7ca79", borderColor: "rgba(231,202,121,0.2)" }}>
                        <Link2 size={16} /> Conectar Google Calendar
                      </a>
                      <div className="p-3 rounded-lg bg-bg-tertiary space-y-1">
                        <p className="text-xs text-text-muted font-medium">Requisitos:</p>
                        <ul className="text-xs text-text-muted space-y-0.5 list-disc list-inside">
                          <li>Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local</li>
                          <li>Crea un proyecto en Google Cloud Console</li>
                          <li>Habilita la Google Calendar API</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Delete modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-bg-secondary rounded-2xl border border-border max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Delete account</h3>
                  <p className="text-xs text-text-muted">This action cannot be undone</p>
                </div>
                <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }} className="ml-auto p-1 rounded-lg hover:bg-bg-hover text-text-muted">
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-text-secondary">This will permanently delete your account and all associated data including tasks, projects, and statistics.</p>
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Type <span className="text-red-400 font-mono font-bold">DELETE</span> to confirm</label>
                <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE"
                  className="w-full px-3 py-2.5 rounded-lg bg-bg-primary border border-border text-sm text-text-primary focus:outline-none focus:border-red-500/50 transition-colors" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-bg-tertiary text-text-secondary hover:bg-bg-hover transition-colors">
                  Cancel
                </button>
                <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== "DELETE" || deleting}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {deleting ? "Deleting..." : "Delete my account"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Page export with Suspense boundary (required for useSearchParams)
   ───────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="w-8 h-8 border-4 border-[#e7ca79]/30 border-t-[#e7ca79] rounded-full animate-spin" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
