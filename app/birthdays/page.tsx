"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Cake, Edit2, Trash2,
  Sparkles, Gift, StickyNote, Users, Send, List, Loader2,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

// ── Types ────────────────────────────────────────────────────────
interface Birthday {
  _id: string;
  name: string;
  date: string; // "MM-DD"
  relation: "familia" | "amigo" | "socio" | "pareja" | "otro";
  birthYear?: number;
  notes?: string;
  createdAt: string;
}

// ── Constants ────────────────────────────────────────────────────
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTHS_EN_PARSE: Record<string, string> = {
  enero:"01",febrero:"02",marzo:"03",abril:"04",mayo:"05",junio:"06",
  julio:"07",agosto:"08",septiembre:"09",octubre:"10",noviembre:"11",diciembre:"12",
  january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
  july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
};
const RELATION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  familia: { label: "Familia",  color: "#e7ca79", bg: "#e7ca7920" },
  amigo:   { label: "Amigo",    color: "#8b7ec8", bg: "#8b7ec820" },
  socio:   { label: "Socio",    color: "#4a9e7e", bg: "#4a9e7e20" },
  pareja:  { label: "Pareja",   color: "#e77979", bg: "#e7797920" },
  otro:    { label: "Otro",     color: "#6b8aaf", bg: "#6b8aaf20" },
};
const GOLD = "#e7ca79";

// ── Helpers ──────────────────────────────────────────────────────
function todayMMDD() {
  const d = new Date();
  return `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function daysUntil(mmdd: string): number {
  const [m, day] = mmdd.split("-").map(Number);
  const now = new Date();
  const next = new Date(now.getFullYear(), m - 1, day);
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  const diff = Math.ceil((next.getTime() - now.setHours(0,0,0,0)) / 86400000);
  return diff;
}

function getAge(mmdd: string, birthYear?: number) {
  if (!birthYear) return null;
  const [m, d] = mmdd.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

function parseNLDate(text: string): { name: string; date: string } | null {
  const t = text.trim().toLowerCase();
  // "el cumple de Carlos es el 15 de mayo"
  // "Carlos cumple el 3 de junio"
  // "Carlos, 15 de mayo"
  // "Carlos: 15/5" or "Carlos: 15-5"
  const patterns = [
    /el\s+cumple\s+de\s+(.+?)\s+es\s+el\s+(\d{1,2})\s+de\s+(\w+)/,
    /(.+?)\s+cumple\s+(?:años\s+)?el\s+(\d{1,2})\s+de\s+(\w+)/,
    /(.+?)[,:]\s*(\d{1,2})\s+de\s+(\w+)/,
    /(.+?)[,:]\s*(\d{1,2})[\/\-](\d{1,2})/,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) {
      const name = m[1].trim().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      const day = String(parseInt(m[2])).padStart(2,"0");
      const monthRaw = m[3].toLowerCase();
      const month = MONTHS_EN_PARSE[monthRaw] || String(parseInt(monthRaw)).padStart(2,"0");
      if (month && day) return { name, date: `${month}-${day}` };
    }
  }
  return null;
}

function formatDateDisplay(mmdd: string) {
  const [m, d] = mmdd.split("-").map(Number);
  return `${d} de ${MONTHS_ES[m - 1]}`;
}

// ── Confetti ─────────────────────────────────────────────────────
function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 48 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 2.5 + Math.random() * 1.5,
    color: [GOLD, "#c4a94f","#8b7ec8","#4a9e7e","#fff","#e77979"][Math.floor(Math.random() * 6)],
    size: 4 + Math.random() * 5,
    shape: Math.random() > 0.5 ? "50%" : "2px",
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-[200] overflow-hidden">
      {particles.map((p) => (
        <div key={p.id} style={{
          position: "absolute", top: 0, left: `${p.left}%`,
          width: p.size, height: p.size,
          background: p.color, borderRadius: p.shape,
          animation: `confettiFall ${p.duration}s ${p.delay}s ease-in both`,
        }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { opacity:1; transform:translateY(-10px) rotate(0deg) scale(1); }
          80%  { opacity:0.7; }
          100% { opacity:0; transform:translateY(100vh) rotate(720deg) scale(0.5); }
        }
      `}</style>
    </div>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────────
function BirthdayModal({ initial, onSave, onClose }: {
  initial?: Partial<Birthday>;
  onSave: (data: Partial<Birthday>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [day, setDay] = useState(initial?.date ? initial.date.split("-")[1] : "");
  const [month, setMonth] = useState(initial?.date ? initial.date.split("-")[0] : "");
  const [birthYear, setBirthYear] = useState(initial?.birthYear ? String(initial.birthYear) : "");
  const [relation, setRelation] = useState<string>(initial?.relation || "amigo");
  const [notes, setNotes] = useState(initial?.notes || "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const submit = () => {
    if (!name.trim() || !day || !month) return;
    const mm = String(parseInt(month)).padStart(2,"0");
    const dd = String(parseInt(day)).padStart(2,"0");
    onSave({
      name: name.trim(),
      date: `${mm}-${dd}`,
      relation: relation as Birthday["relation"],
      ...(birthYear ? { birthYear: parseInt(birthYear) } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div ref={ref} className="relative w-full max-w-md bg-bg-secondary border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border"
          style={{ background: "linear-gradient(135deg,rgba(231,202,121,0.08),transparent)" }}>
          <div className="flex items-center gap-2">
            <Cake size={16} style={{ color: GOLD }} />
            <span className="font-semibold text-text-primary text-sm">
              {initial?._id ? "Editar persona" : "Agregar persona"}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted transition-colors"><X size={14} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-[10px] text-text-muted uppercase tracking-wide mb-1.5 block">Nombre *</label>
            <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Nombre completo"
              className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#e7ca79]/50 transition-colors" />
          </div>

          {/* Date */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-[10px] text-text-muted uppercase tracking-wide mb-1.5 block">Día *</label>
              <input type="number" min="1" max="31" value={day} onChange={(e) => setDay(e.target.value)}
                placeholder="15"
                className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#e7ca79]/50 transition-colors" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-text-muted uppercase tracking-wide mb-1.5 block">Mes *</label>
              <select value={month} onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-[#e7ca79]/50 transition-colors appearance-none">
                <option value="">— Mes —</option>
                {MONTHS_ES.map((m, i) => (
                  <option key={i} value={String(i+1).padStart(2,"0")}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Birth year */}
          <div>
            <label className="text-[10px] text-text-muted uppercase tracking-wide mb-1.5 block">Año de nacimiento <span className="normal-case opacity-60">(opcional, para calcular edad)</span></label>
            <input type="number" min="1900" max={new Date().getFullYear()} value={birthYear} onChange={(e) => setBirthYear(e.target.value)}
              placeholder="1990"
              className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#e7ca79]/50 transition-colors" />
          </div>

          {/* Relation */}
          <div>
            <label className="text-[10px] text-text-muted uppercase tracking-wide mb-2 block">Relación</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(RELATION_CONFIG).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => setRelation(key)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={relation === key
                    ? { background: cfg.bg, borderColor: cfg.color, color: cfg.color }
                    : { background: "transparent", borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vibe notes */}
          <div>
            <label className="text-[10px] text-text-muted uppercase tracking-wide mb-1.5 block flex items-center gap-1">
              <StickyNote size={10} /> Vibe notes <span className="normal-case opacity-60">(qué le gusta, qué le regalaste antes)</span>
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Le encanta el café, le regalé un libro en 2024..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#e7ca79]/50 transition-colors resize-none" />
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-text-muted hover:bg-bg-hover transition-colors">Cancelar</button>
          <button onClick={submit} disabled={!name.trim() || !day || !month}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-30 transition-all"
            style={{ background: `linear-gradient(135deg,${GOLD},#c4a94f)` }}>
            {initial?._id ? "Guardar cambios" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Person Card ───────────────────────────────────────────────────
function PersonCard({ b, isToday, onEdit, onDelete, onGiftTask, onConfetti }: {
  b: Birthday; isToday: boolean;
  onEdit: () => void; onDelete: () => void; onGiftTask: () => void; onConfetti: () => void;
}) {
  const days = daysUntil(b.date);
  const age = getAge(b.date, b.birthYear);
  const rel = RELATION_CONFIG[b.relation] || RELATION_CONFIG.otro;
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div onClick={() => { if (isToday) onConfetti(); }}
      className={`group relative rounded-2xl border p-4 transition-all cursor-default ${
        isToday
          ? "border-[#e7ca79]/60 shadow-[0_0_24px_rgba(231,202,121,0.15)]"
          : "border-border hover:border-border/80"
      }`}
      style={{
        background: isToday
          ? "linear-gradient(135deg,rgba(231,202,121,0.08),rgba(196,169,79,0.04))"
          : "var(--bg-secondary)",
      }}>

      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar circle */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
            style={{ background: isToday ? `${GOLD}30` : `${rel.color}20`, color: isToday ? GOLD : rel.color }}>
            {b.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-text-primary truncate">{b.name}</p>
              {isToday && <span className="text-base">🎂</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: rel.bg, color: rel.color }}>{rel.label}</span>
              <span className="text-[10px] text-text-muted">{formatDateDisplay(b.date)}</span>
              {age !== null && <span className="text-[10px] text-text-muted">· {isToday ? `${age + 1}` : age} años{isToday ? " 🎉" : ""}</span>}
            </div>
          </div>
        </div>

        {/* Countdown pill */}
        <div className={`flex-shrink-0 text-right ${isToday ? "" : "opacity-70"}`}>
          {isToday ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: `${GOLD}20`, color: GOLD }}>Hoy ✨</span>
          ) : days <= 7 ? (
            <span className="text-xs font-semibold text-orange-400 bg-orange-400/10 px-2.5 py-1 rounded-full">{days}d</span>
          ) : (
            <span className="text-xs text-text-muted">{days}d</span>
          )}
        </div>
      </div>

      {/* Vibe notes */}
      {b.notes && (
        <div className="mt-1 mb-2">
          <button onClick={(e) => { e.stopPropagation(); setShowNotes(!showNotes); }}
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary transition-colors">
            <StickyNote size={9} /> {showNotes ? "Ocultar notas" : "Ver vibe notes"}
          </button>
          {showNotes && (
            <p className="mt-1.5 text-[11px] text-text-secondary bg-bg-tertiary rounded-lg px-3 py-2 border border-border/50 italic leading-relaxed">
              {b.notes}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onGiftTask(); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors"
          style={{ background: `${GOLD}15`, color: GOLD }}
          title="Crear tarea de regalo">
          <Gift size={10} /> Crear tarea
        </button>
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors">
          <Edit2 size={12} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors">
          <Trash2 size={12} />
        </button>
      </div>

      {/* Today glow bar */}
      {isToday && <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl" style={{ background: `linear-gradient(90deg,transparent,${GOLD},transparent)` }} />}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function BirthdaysPage() {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth()); // 0-based
  const [viewYear] = useState(new Date().getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState<Birthday | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const [activeTab, setActiveTab] = useState<"month" | "all">("month");

  // Quick / AI add
  const [aiText, setAiText] = useState("");
  const [aiParsed, setAiParsed] = useState<{ name: string; date: string } | null>(null);
  const [aiError, setAiError] = useState("");

  // Bulk add
  const [bulkText, setBulkText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Today's date
  const todayMMDDVal = todayMMDD();
  const todayBirthdays = birthdays.filter(b => b.date === todayMMDDVal);

  // Load birthdays
  const fetchBirthdays = useCallback(async () => {
    try {
      const res = await fetch("/api/birthdays");
      const data = await res.json();
      if (Array.isArray(data)) setBirthdays(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBirthdays(); }, [fetchBirthdays]);

  // Banner dismissal check
  useEffect(() => {
    const key = `birthday-banner-dismissed-${new Date().getFullYear()}-${todayMMDDVal}`;
    setBannerDismissed(!!localStorage.getItem(key));
  }, [todayMMDDVal]);

  const dismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem(`birthday-banner-dismissed-${new Date().getFullYear()}-${todayMMDDVal}`, "1");
  };

  // ── CRUD ──────────────────────────────────────────────────────
  const handleAdd = async (data: Partial<Birthday>) => {
    const res = await fetch("/api/birthdays", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const created = await res.json();
    setBirthdays(prev => [...prev, created]);
    setShowAddModal(false);
  };

  const handleEdit = async (id: string, data: Partial<Birthday>) => {
    const res = await fetch(`/api/birthdays/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const updated = await res.json();
    setBirthdays(prev => prev.map(b => b._id === id ? { ...b, ...updated } : b));
    setEditingBirthday(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este cumpleaños?")) return;
    await fetch(`/api/birthdays/${id}`, { method: "DELETE" });
    setBirthdays(prev => prev.filter(b => b._id !== id));
  };

  // ── Gift task creation ────────────────────────────────────────
  const handleGiftTask = async (b: Birthday) => {
    const [m, d] = b.date.split("-").map(Number);
    const today = new Date();
    let taskDate = new Date(today.getFullYear(), m - 1, d - 3);
    if (taskDate < today) taskDate = new Date(today.getFullYear() + 1, m - 1, d - 3);
    const dueDateStr = taskDate.toISOString().split("T")[0];
    await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `🎁 Comprar detalle para ${b.name}`,
        description: `Cumpleaños de ${b.name} el ${formatDateDisplay(b.date)} (${RELATION_CONFIG[b.relation]?.label || ""})${b.notes ? `\n\nVibe notes: ${b.notes}` : ""}`,
        category: "lifestyle", subcategory: "Social / Networking",
        priority: 2, roi: 6, joy: 8, dueDate: dueDateStr,
      }),
    });
    alert(`✅ Tarea creada para el ${dueDateStr} — recuerda el detalle de ${b.name}!`);
  };

  // ── AI Quick Add ──────────────────────────────────────────────
  const handleAiAdd = () => {
    setAiError("");
    if (!aiText.trim()) return;
    const parsed = parseNLDate(aiText);
    if (parsed) {
      setAiParsed(parsed);
    } else {
      setAiError("No pude entender la fecha. Intenta: \"El cumple de Carlos es el 15 de mayo\"");
    }
  };

  const confirmAiAdd = async () => {
    if (!aiParsed) return;
    await handleAdd({ ...aiParsed, relation: "amigo" });
    setAiText(""); setAiParsed(null);
  };

  // ── Bulk Add ──────────────────────────────────────────────────
  const handleBulkAdd = async () => {
    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setBulkSaving(true);
    let added = 0;
    for (const line of lines) {
      const parsed = parseNLDate(line);
      if (parsed) {
        await fetch("/api/birthdays", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...parsed, relation: "amigo" }),
        });
        added++;
      }
    }
    await fetchBirthdays();
    setBulkSaving(false);
    setBulkText("");
    setShowBulk(false);
    if (added < lines.length) alert(`${added} de ${lines.length} entradas procesadas. Las que no pude parsear fueron ignoradas.`);
  };

  // ── Calendar grid ─────────────────────────────────────────────
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const calOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Mon-first

  const birthdaysThisMonth = birthdays.filter(b => {
    const bm = parseInt(b.date.split("-")[0]) - 1;
    return bm === viewMonth;
  }).sort((a, b) => parseInt(a.date.split("-")[1]) - parseInt(b.date.split("-")[1]));

  // Upcoming 3 (excluding today)
  const upcoming = [...birthdays]
    .map(b => ({ ...b, days: daysUntil(b.date) }))
    .filter(b => b.days > 0 && b.days <= 90)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  // Displayed list
  const displayList = activeTab === "month"
    ? birthdaysThisMonth
    : [...birthdays].sort((a, b) => {
        const da = daysUntil(a.date); const db = daysUntil(b.date);
        return da - db;
      });

  const triggerConfetti = () => {
    setConfetti(true);
    setTimeout(() => setConfetti(false), 5000);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <TopBar onAddTask={() => {}} />

        <Confetti active={confetti} />

        {/* ── Today Banner ───────────────────────────────── */}
        {todayBirthdays.length > 0 && !bannerDismissed && (
          <div className="mx-4 md:mx-6 mt-4 rounded-2xl border px-5 py-3.5 flex items-center justify-between gap-4"
            style={{ background: "linear-gradient(135deg,rgba(231,202,121,0.12),rgba(196,169,79,0.06))", borderColor: `${GOLD}40` }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎂</span>
              <div>
                <p className="text-sm font-bold" style={{ color: GOLD }}>
                  Hoy celebramos el ciclo de {todayBirthdays.map(b => b.name).join(" y ")}
                </p>
                <p className="text-xs text-text-muted mt-0.5">Un día especial para honrar su presencia en tu vida</p>
              </div>
            </div>
            <button onClick={dismissBanner}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors hover:opacity-80"
              style={{ borderColor: `${GOLD}50`, color: GOLD }}>
              Ok, gracias ✓
            </button>
          </div>
        )}

        <div className="p-4 md:p-6 pb-24 md:pb-6">
          {/* ── Page header ─────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}20` }}>
                <Cake size={18} style={{ color: GOLD }} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-text-primary">Ancestral Connections</h1>
                <p className="text-xs text-text-muted">{birthdays.length} personas · celebrando su ciclo de vida</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowBulk(!showBulk)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs text-text-muted hover:bg-bg-hover transition-colors">
                <List size={13} /> Carga masiva
              </button>
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
                style={{ background: `linear-gradient(135deg,${GOLD},#c4a94f)` }}>
                <Plus size={14} /> Agregar persona
              </button>
            </div>
          </div>

          {/* ── AI Quick Add ────────────────────────────── */}
          <div className="mb-6 rounded-2xl border border-border bg-bg-secondary p-4"
            style={{ background: "linear-gradient(135deg,rgba(139,126,200,0.06),rgba(74,158,126,0.04))" }}>
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles size={13} className="text-purple-400" />
              <span className="text-xs font-semibold text-text-secondary">Agrega por lenguaje natural</span>
            </div>
            <div className="flex gap-2">
              <input type="text" value={aiText} onChange={(e) => setAiText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAiAdd(); }}
                placeholder="«El cumple de Carlos es el 15 de mayo» o «Maria cumple el 3 de junio»"
                className="flex-1 px-3 py-2 rounded-xl bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-purple-400/40 transition-colors" />
              <button onClick={handleAiAdd}
                className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-sm font-medium transition-colors flex items-center gap-1.5">
                <Send size={13} /> Parsear
              </button>
            </div>
            {aiError && <p className="text-xs text-red-400 mt-2">{aiError}</p>}
            {aiParsed && (
              <div className="mt-3 flex items-center gap-3 p-3 rounded-xl border bg-bg-tertiary"
                style={{ borderColor: `${GOLD}30` }}>
                <div className="flex-1">
                  <p className="text-xs text-text-muted mb-0.5">Encontré esto:</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {aiParsed.name} · <span style={{ color: GOLD }}>{formatDateDisplay(aiParsed.date)}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setAiParsed(null); setAiText(""); }}
                    className="px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:bg-bg-hover border border-border transition-colors">
                    Cancelar
                  </button>
                  <button onClick={confirmAiAdd}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110"
                    style={{ background: `linear-gradient(135deg,${GOLD},#c4a94f)` }}>
                    Confirmar ✓
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Bulk Add ────────────────────────────────── */}
          {showBulk && (
            <div className="mb-6 rounded-2xl border border-border bg-bg-secondary p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <List size={13} className="text-text-muted" />
                  <span className="text-xs font-semibold text-text-secondary">Carga masiva — una persona por línea</span>
                </div>
                <button onClick={() => setShowBulk(false)} className="text-text-muted hover:text-text-primary"><X size={14} /></button>
              </div>
              <p className="text-[10px] text-text-muted mb-2">Formato: «Carlos, 15 de mayo» o «Maria: 3/6»</p>
              <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)}
                placeholder={"Carlos, 15 de mayo\nMaria: 3 de junio\nPedro cumple el 20 de enero"}
                rows={5}
                className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#e7ca79]/40 transition-colors resize-none font-mono text-xs" />
              <div className="flex justify-end mt-3">
                <button onClick={handleBulkAdd} disabled={bulkSaving || !bulkText.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:brightness-110"
                  style={{ background: `linear-gradient(135deg,${GOLD},#c4a94f)` }}>
                  {bulkSaving ? <><Loader2 size={13} className="animate-spin" /> Procesando...</> : <><Plus size={13} /> Agregar todos</>}
                </button>
              </div>
            </div>
          )}

          {/* ── Main grid ───────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left: Calendar + List ─────────────────── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Mini calendar */}
              <div className="rounded-2xl border border-border bg-bg-secondary overflow-hidden">
                {/* Calendar header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border"
                  style={{ background: "linear-gradient(135deg,rgba(231,202,121,0.05),transparent)" }}>
                  <button onClick={() => setViewMonth(m => m === 0 ? 11 : m - 1)}
                    className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted transition-colors"><ChevronLeft size={16} /></button>
                  <div className="text-center">
                    <p className="text-sm font-bold text-text-primary">{MONTHS_ES[viewMonth]} {viewYear}</p>
                    <p className="text-[10px] text-text-muted">{birthdaysThisMonth.length} cumpleaños este mes</p>
                  </div>
                  <button onClick={() => setViewMonth(m => m === 11 ? 0 : m + 1)}
                    className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted transition-colors"><ChevronRight size={16} /></button>
                </div>

                <div className="p-4">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 mb-2">
                    {["Lu","Ma","Mi","Ju","Vi","Sa","Do"].map(d => (
                      <div key={d} className="text-center text-[9px] font-bold text-text-muted uppercase py-1">{d}</div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: calOffset }, (_, i) => <div key={`e-${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const dayNum = i + 1;
                      const dd = String(dayNum).padStart(2,"0");
                      const mm = String(viewMonth + 1).padStart(2,"0");
                      const cellKey = `${mm}-${dd}`;
                      const hasBday = birthdays.some(b => b.date === cellKey);
                      const isCurrentToday = todayMMDDVal === cellKey;
                      const bdayPeople = birthdays.filter(b => b.date === cellKey);
                      return (
                        <div key={dayNum} className="relative aspect-square flex flex-col items-center justify-center rounded-lg"
                          style={{
                            background: isCurrentToday ? `${GOLD}20` : hasBday ? `rgba(139,126,200,0.08)` : undefined,
                          }}>
                          <span className={`text-[11px] font-semibold ${isCurrentToday ? "" : hasBday ? "text-text-primary" : "text-text-secondary"}`}
                            style={isCurrentToday ? { color: GOLD } : {}}>
                            {dayNum}
                          </span>
                          {hasBday && (
                            <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-[24px]">
                              {bdayPeople.slice(0, 2).map((bp, bi) => (
                                <div key={bi} className="w-1.5 h-1.5 rounded-full"
                                  style={{ background: isCurrentToday ? GOLD : RELATION_CONFIG[bp.relation]?.color || "#888" }} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tab toggle */}
              <div className="flex items-center gap-1 rounded-xl bg-bg-secondary border border-border p-1 w-fit">
                {([["month", `${MONTHS_ES[viewMonth]}`], ["all", "Todos"]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === key ? "text-white shadow-sm" : "text-text-muted hover:text-text-secondary"
                    }`}
                    style={activeTab === key ? { background: `linear-gradient(135deg,${GOLD},#c4a94f)` } : {}}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Birthday list */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-text-muted" />
                </div>
              ) : displayList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                  <Cake size={28} className="text-text-muted/40 mx-auto mb-3" />
                  <p className="text-sm text-text-muted">
                    {activeTab === "month" ? `No hay cumpleaños en ${MONTHS_ES[viewMonth]}` : "No hay personas aún. ¡Agrega la primera!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayList.map(b => (
                    <PersonCard key={b._id} b={b}
                      isToday={b.date === todayMMDDVal}
                      onEdit={() => setEditingBirthday(b)}
                      onDelete={() => handleDelete(b._id)}
                      onGiftTask={() => handleGiftTask(b)}
                      onConfetti={triggerConfetti}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Right: Upcoming + Stats ─────────────────── */}
            <div className="space-y-5">

              {/* Upcoming birthdays */}
              <div className="rounded-2xl border border-border bg-bg-secondary overflow-hidden"
                style={{ background: "linear-gradient(135deg,rgba(231,202,121,0.04),var(--bg-secondary))" }}>
                <div className="px-4 py-3.5 border-b border-border flex items-center gap-2">
                  <span className="text-base">📅</span>
                  <span className="text-sm font-semibold text-text-primary">Próximos cumpleaños</span>
                </div>
                <div className="p-3 space-y-2">
                  {upcoming.length === 0 ? (
                    <p className="text-xs text-text-muted py-4 text-center">Nada en los próximos 90 días</p>
                  ) : upcoming.map(b => {
                    const rel = RELATION_CONFIG[b.relation] || RELATION_CONFIG.otro;
                    const urgency = b.days <= 3 ? "text-red-400" : b.days <= 7 ? "text-orange-400" : "text-text-muted";
                    return (
                      <div key={b._id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-bg-hover transition-colors group">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: rel.bg, color: rel.color }}>
                          {b.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{b.name}</p>
                          <p className="text-[10px] text-text-muted">{formatDateDisplay(b.date)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-xs font-bold ${urgency}`}>
                            {b.days === 0 ? "Hoy 🎂" : `${b.days}d`}
                          </p>
                          {b.days <= 3 && b.days > 0 && (
                            <p className="text-[9px] text-orange-400">¡Pronto!</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats card */}
              <div className="rounded-2xl border border-border bg-bg-secondary p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-text-muted" />
                  <span className="text-sm font-semibold text-text-primary">Círculo de vida</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(RELATION_CONFIG).map(([key, cfg]) => {
                    const count = birthdays.filter(b => b.relation === key).length;
                    if (!count) return null;
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                          <span className="text-xs text-text-secondary">{cfg.label}</span>
                        </div>
                        <span className="text-xs font-semibold text-text-primary">{count}</span>
                      </div>
                    );
                  })}
                  {birthdays.length === 0 && (
                    <p className="text-xs text-text-muted">Sin personas aún</p>
                  )}
                </div>
              </div>

              {/* Notifications (TODO) */}
              <div className="rounded-2xl border border-dashed border-border p-4 opacity-60">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🔔</span>
                  <span className="text-sm font-semibold text-text-primary">Notificaciones externas</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Notificaciones por correo y Telegram (3 días antes y el mismo día) — <span className="italic">por implementar</span>
                </p>
                <div className="mt-2 flex gap-1.5">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-bg-tertiary border border-border text-text-muted">📧 Email</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-bg-tertiary border border-border text-text-muted">✈️ Telegram</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Modals ───────────────────────────────────── */}
        {showAddModal && (
          <BirthdayModal onSave={handleAdd} onClose={() => setShowAddModal(false)} />
        )}
        {editingBirthday && (
          <BirthdayModal initial={editingBirthday}
            onSave={(data) => handleEdit(editingBirthday._id, data)}
            onClose={() => setEditingBirthday(null)} />
        )}
      </main>
    </div>
  );
}
