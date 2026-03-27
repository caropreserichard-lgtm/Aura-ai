"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { User, Mail, Crown, Save, LogOut, ArrowLeft, Check } from "lucide-react";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [empireName, setEmpireName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setFullName(session.user.name || "");
      // Fetch empire name from DB
      fetch("/api/auth/profile").then(r => r.json()).then(d => {
        if (d.empireName) setEmpireName(d.empireName);
      }).catch(() => {});
    }
  }, [session]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, empireName }),
      });
      await update({ name: fullName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

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
        <div className="max-w-lg mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-text-primary mb-6">Mi Perfil</h1>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, #d4a04e, #b8860b)" }}>
              {fullName?.[0]?.toUpperCase() || "T"}
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">{fullName || "Usuario"}</p>
              <p className="text-sm text-text-muted">{session?.user?.email}</p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="text-xs text-text-muted uppercase tracking-wide mb-1.5 block">Nombre completo</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-secondary border border-border text-sm text-text-primary focus:outline-none focus:border-accent" />
              </div>
            </div>

            <div>
              <label className="text-xs text-text-muted uppercase tracking-wide mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="email" value={session?.user?.email || ""} disabled
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-tertiary border border-border text-sm text-text-muted cursor-not-allowed" />
              </div>
            </div>

            <div>
              <label className="text-xs text-text-muted uppercase tracking-wide mb-1.5 block">
                <Crown size={12} className="inline mr-1" style={{ color: "#d4a04e" }} />
                Nombre del Imperio
              </label>
              <input type="text" value={empireName} onChange={(e) => setEmpireName(e.target.value)}
                placeholder="Mi Imperio"
                className="w-full px-4 py-2.5 rounded-xl bg-bg-secondary border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                style={{ borderColor: "rgba(212,160,78,0.3)" }} />
            </div>

            <button onClick={handleSave} disabled={saving}
              className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
              style={{
                background: saved ? "#10B981" : "linear-gradient(135deg, #d4a04e, #b8860b)",
                color: "white",
              }}>
              {saved ? <><Check size={16} /> Guardado</> : <><Save size={16} /> Guardar cambios</>}
            </button>
          </div>

          {/* Danger zone */}
          <div className="mt-12 pt-6 border-t border-border">
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors">
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
