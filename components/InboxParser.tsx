"use client";

import { useState } from "react";
import { Send, Loader2, Check, X, Pencil } from "lucide-react";
import { CATEGORIES, Category, PRIORITY_CONFIG } from "@/lib/types";
import { calculateFlowScore, calculateXP } from "@/lib/scoring";
import { useSubcategories } from "@/lib/hooks/useSubcategories";

interface ParsedItem {
  title: string;
  category: Category;
  subcategory: string;
  roi: number;
  joy: number;
  url: string | null;
}

interface InboxParserProps {
  onCreateTasks: (tasks: ParsedItem[]) => void;
}

export default function InboxParser({ onCreateTasks }: InboxParserProps) {
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError(null);
    setItems([]);

    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al procesar");
        return;
      }

      setItems(data.items);
      setSelected(new Set(data.items.map((_: ParsedItem, i: number) => i)));
    } catch (err) {
      setError("Error de conexión");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
  };

  const handleApprove = () => {
    const approved = items.filter((_, i) => selected.has(i));
    onCreateTasks(approved);
    setItems([]);
    setRawText("");
    setSelected(new Set());
  };

  const updateItem = (idx: number, updates: Partial<ParsedItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...updates } : item))
    );
    setEditingIdx(null);
  };

  return (
    <div className="space-y-6">
      {/* Input area */}
      <div className="rounded-xl bg-bg-secondary border border-white/5 p-5">
        <h2 className="font-heading font-bold text-lg mb-3">Inbox inteligente</h2>
        <p className="text-sm text-text-muted mb-4">
          Pega links, ideas, notas o textos sueltos. Claude los clasifica por ti.
        </p>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={"Pega aquí tus ideas, links, notas...\n\nEjemplos:\n- https://articulo-sobre-memecoins.com\n- Investigar nueva estrategia de marketing para el gastro bar\n- Leer sobre la historia de la Gran Colombia\n- Empezar a meditar 10 min diarios"}
          rows={10}
          className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-white/5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 text-sm resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-text-muted">
            {rawText.length > 0
              ? `${rawText.split("\n").filter((l) => l.trim()).length} líneas detectadas`
              : ""}
          </span>
          <button
            onClick={handleParse}
            disabled={loading || !rawText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg xp-gradient text-white font-medium text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Procesando...
              </>
            ) : (
              <>
                <Send size={16} /> Procesar con IA
              </>
            )}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
      </div>

      {/* Results */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-text-secondary">
              {items.length} items encontrados — selecciona los que quieras crear
            </h3>
            <button
              onClick={handleApprove}
              disabled={selected.size === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-emerald/20 text-accent-emerald font-medium text-sm hover:bg-accent-emerald/30 transition-colors disabled:opacity-40"
            >
              <Check size={16} /> Crear {selected.size} tarea{selected.size !== 1 ? "s" : ""}
            </button>
          </div>

          {items.map((item, idx) => {
            const cat = CATEGORIES[item.category] || CATEGORIES.trabajo;
            const flowScore = calculateFlowScore(item.roi, item.joy);
            const xp = calculateXP(flowScore, item.category);
            const isSelected = selected.has(idx);
            const isEditing = editingIdx === idx;

            return (
              <div
                key={idx}
                className={`rounded-xl border p-4 transition-all ${
                  isSelected
                    ? "bg-bg-secondary border-accent-purple/30"
                    : "bg-bg-secondary/50 border-white/5 opacity-50"
                }`}
              >
                {isEditing ? (
                  <EditItemForm
                    item={item}
                    onSave={(updates) => updateItem(idx, updates)}
                    onCancel={() => setEditingIdx(null)}
                  />
                ) : (
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleSelect(idx)}
                      className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 transition-all flex items-center justify-center ${
                        isSelected
                          ? "bg-accent-purple border-accent-purple"
                          : "border-text-muted"
                      }`}
                    >
                      {isSelected && (
                        <Check size={12} className="text-white" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-text-primary">
                        {item.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{
                            backgroundColor: `${cat.color}15`,
                            color: cat.color,
                          }}
                        >
                          {cat.icon} {item.subcategory}
                        </span>
                        <span className="text-xs text-text-muted">
                          ROI: {item.roi} · Joy: {item.joy} · Flow: {flowScore}
                        </span>
                        <span className="font-mono text-xs text-accent-pink font-medium">
                          +{xp}XP
                        </span>
                      </div>
                      {item.url && (
                        <p className="text-xs text-accent-blue mt-1 truncate">
                          {item.url}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingIdx(idx)}
                        className="p-1.5 rounded-md hover:bg-white/5 text-text-muted"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setItems((prev) => prev.filter((_, i) => i !== idx));
                          selected.delete(idx);
                        }}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-text-muted hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditItemForm({
  item,
  onSave,
  onCancel,
}: {
  item: ParsedItem;
  onSave: (updates: Partial<ParsedItem>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [category, setCategory] = useState<Category>(item.category);
  const [subcategory, setSubcategory] = useState(item.subcategory);
  const [roi, setRoi] = useState(item.roi);
  const [joy, setJoy] = useState(item.joy);
  const { subcategories: dynamicSubs } = useSubcategories();

  const currentSubs = dynamicSubs[category] || CATEGORIES[category].subcategories;

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-white/5 text-text-primary text-sm focus:outline-none focus:border-accent-purple/50"
      />
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CATEGORIES) as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setCategory(cat);
              const subs = dynamicSubs[cat] || CATEGORIES[cat].subcategories;
              setSubcategory(subs[0]);
            }}
            className={`px-2 py-1 rounded-md text-xs font-medium ${
              category === cat
                ? "bg-accent-purple/20 text-accent-purple"
                : "bg-white/5 text-text-muted"
            }`}
          >
            {CATEGORIES[cat].icon} {CATEGORIES[cat].label}
          </button>
        ))}
      </div>
      <select
        value={subcategory}
        onChange={(e) => setSubcategory(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-white/5 text-text-primary text-sm focus:outline-none focus:border-accent-purple/50"
      >
        {currentSubs.map((sub) => (
          <option key={sub} value={sub}>
            {sub}
          </option>
        ))}
      </select>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-xs text-text-muted">ROI: {roi}</label>
          <input
            type="range"
            min={1}
            max={10}
            value={roi}
            onChange={(e) => setRoi(Number(e.target.value))}
            className="w-full accent-accent-amber"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-text-muted">Joy: {joy}</label>
          <input
            type="range"
            min={1}
            max={10}
            value={joy}
            onChange={(e) => setJoy(Number(e.target.value))}
            className="w-full accent-accent-emerald"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() =>
            onSave({
              title,
              category,
              subcategory,
              roi,
              joy,
            })
          }
          className="px-3 py-1.5 rounded-md bg-accent-emerald/20 text-accent-emerald text-xs font-medium"
        >
          Guardar
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md bg-white/5 text-text-muted text-xs font-medium"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
