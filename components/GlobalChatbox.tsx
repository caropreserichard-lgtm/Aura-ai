"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, CheckCircle2, ExternalLink } from "lucide-react";

interface ClassifyResult {
  title: string;
  category: string;
  insight: string;
}

interface SavedItem {
  title: string;
  category: string;
  insight: string;
  url: string;
}

const URL_REGEX = /https?:\/\/[^\s]+/g;

function isUrl(text: string) {
  return /^https?:\/\/[^\s]+/.test(text.trim());
}

export default function GlobalChatbox() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "classifying" | "saving" | "done" | "error">("idle");
  const [result, setResult] = useState<SavedItem | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const reset = () => {
    setInput("");
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
  };

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text) return;

    const urls = text.match(URL_REGEX);
    if (!urls || urls.length === 0) {
      setErrorMsg("Pega un link válido (https://...)");
      return;
    }

    const url = urls[0];
    setErrorMsg("");
    setStatus("classifying");

    try {
      // Step 1: Classify
      const classRes = await fetch("/api/vault/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!classRes.ok) {
        const err = await classRes.json();
        throw new Error(err.error || "Error al clasificar");
      }

      const classified: ClassifyResult = await classRes.json();

      // Step 2: Save
      setStatus("saving");
      const saveRes = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          title: classified.title,
          category: classified.category,
          insight: classified.insight,
        }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json();
        throw new Error(err.error || "Error al guardar");
      }

      setResult({ ...classified, url });
      setStatus("done");
      setInput("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado");
      setStatus("error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") setOpen(false);
  };

  const urlDetected = input.trim() !== "" && isUrl(input.trim());

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => { setOpen((o) => !o); if (!open) reset(); }}
        className="fixed bottom-20 md:bottom-6 right-5 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105"
        style={{
          background: "linear-gradient(135deg, #e7ca79, #c4a94f)",
          boxShadow: "0 4px 20px rgba(231,202,121,0.35)",
        }}
        title="Tayrona Chatbox"
      >
        {open ? <X size={20} color="#1a1a1a" /> : <MessageCircle size={20} color="#1a1a1a" />}
      </button>

      {/* Chatbox panel */}
      {open && (
        <div
          className="fixed bottom-36 md:bottom-22 right-5 z-50 w-80 rounded-2xl border overflow-hidden"
          style={{
            background: "rgba(24,24,24,0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderColor: "rgba(231,202,121,0.2)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(231,202,121,0.1)",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center gap-2 border-b"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{ background: "linear-gradient(135deg, #e7ca79, #c4a94f)", color: "#1a1a1a" }}
            >
              T
            </div>
            <div>
              <p className="text-xs font-semibold text-text-primary">Tayrona AI</p>
              <p className="text-[10px] text-text-muted">Pega un link para guardarlo en La Bóveda</p>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">

            {/* Success state */}
            {status === "done" && result && (
              <div
                className="rounded-xl p-3 text-sm"
                style={{ background: "rgba(231,202,121,0.06)", border: "1px solid rgba(231,202,121,0.15)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={14} color="#e7ca79" />
                  <span className="text-xs font-semibold text-[#e7ca79]">Guardado en La Bóveda</span>
                </div>
                <p className="text-xs text-text-primary font-medium line-clamp-2 mb-1">{result.title}</p>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(231,202,121,0.15)", color: "#e7ca79" }}
                  >
                    {result.category}
                  </span>
                  <a
                    href="/vault"
                    className="text-[10px] text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors"
                  >
                    Ver Bóveda <ExternalLink size={9} />
                  </a>
                </div>
                {result.insight && (
                  <p className="text-[10px] text-text-muted mt-1.5 italic">💡 {result.insight}</p>
                )}
                <button
                  onClick={reset}
                  className="mt-2 text-[10px] text-text-muted hover:text-text-primary transition-colors"
                >
                  + Agregar otro link
                </button>
              </div>
            )}

            {/* Input */}
            {status !== "done" && (
              <>
                <div className="relative">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => { setInput(e.target.value); setErrorMsg(""); }}
                    onKeyDown={handleKeyDown}
                    placeholder="https://..."
                    disabled={status === "classifying" || status === "saving"}
                    className="w-full text-sm px-3 py-2.5 pr-10 rounded-xl outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${errorMsg ? "rgba(212,84,78,0.4)" : urlDetected ? "rgba(231,202,121,0.3)" : "rgba(255,255,255,0.08)"}`,
                      color: "#e8e8e8",
                    }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || status === "classifying" || status === "saving"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-opacity disabled:opacity-40"
                    style={{ color: "#e7ca79" }}
                  >
                    {status === "classifying" || status === "saving"
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Send size={16} />
                    }
                  </button>
                </div>

                {/* Status message */}
                {status === "classifying" && (
                  <p className="text-[10px] text-text-muted animate-pulse">
                    🔍 Analizando y clasificando con IA...
                  </p>
                )}
                {status === "saving" && (
                  <p className="text-[10px] text-text-muted animate-pulse">
                    💾 Guardando en La Bóveda...
                  </p>
                )}
                {errorMsg && (
                  <p className="text-[10px]" style={{ color: "#f87171" }}>{errorMsg}</p>
                )}

                {urlDetected && status === "idle" && (
                  <p className="text-[10px] text-text-muted">
                    ↵ Enter para clasificar y guardar
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
