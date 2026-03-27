"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, User, Crown, ArrowRight, Check, X } from "lucide-react";
import Link from "next/link";
import TayronaLogo from "@/components/TayronaLogo";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [empireName, setEmpireName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const router = useRouter();

  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const passwordValid = passwordChecks.length && passwordChecks.upper && passwordChecks.number;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          fullName: fullName.trim(),
          empireName: empireName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al registrarse");
        setLoading(false);
        return;
      }

      // Auto-login after registration
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Cuenta creada, pero error al iniciar sesión. Intenta en /login");
      } else {
        router.push("/home");
        router.refresh();
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const PasswordCheck = ({ ok, text }: { ok: boolean; text: string }) => (
    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: ok ? "#4ade80" : "#6b7280" }}>
      {ok ? <Check size={11} /> : <X size={11} />} {text}
    </div>
  );

  return (
    <div className="text-center">
      {/* Logo & Title */}
      <div className="mb-8">
        <div className="mx-auto mb-2 flex items-center justify-center rounded-2xl overflow-hidden" style={{ width: 160, height: 160 }}>
          <TayronaLogo size={160} />
        </div>
        <p className="text-sm" style={{ color: "#8ba4c4" }}>Construye tu Ciudad Perdida</p>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border p-6"
        style={{
          background: "rgba(15, 25, 45, 0.8)",
          borderColor: "rgba(74, 144, 217, 0.15)",
          backdropFilter: "blur(20px)",
        }}>

        {step === 1 ? (
          <>
            <h2 className="text-xl font-semibold text-white mb-6">Crear Cuenta</h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg text-sm text-red-300"
                style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b8aaf" }} />
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre completo" required autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(74,144,217,0.2)" }} />
              </div>

              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b8aaf" }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email" required
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(74,144,217,0.2)" }} />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b8aaf" }} />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña" required
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(74,144,217,0.2)" }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {password && (
                <div className="flex gap-3 justify-center">
                  <PasswordCheck ok={passwordChecks.length} text="8+ caracteres" />
                  <PasswordCheck ok={passwordChecks.upper} text="Mayúscula" />
                  <PasswordCheck ok={passwordChecks.number} text="Número" />
                </div>
              )}

              <button onClick={() => { if (fullName && email && passwordValid) setStep(2); }}
                disabled={!fullName || !email || !passwordValid}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #4A90D9 0%, #2d6cb5 100%)",
                  boxShadow: "0 4px 20px rgba(74,144,217,0.3)",
                }}>
                Siguiente <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-white mb-2">Nombra tu Imperio</h2>
            <p className="text-xs mb-6" style={{ color: "#8ba4c4" }}>
              Como los Tayronas construyeron Teyuna, tú construirás tu ciudad de productividad.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Crown size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#d4a04e" }} />
                <input type="text" value={empireName} onChange={(e) => setEmpireName(e.target.value)}
                  placeholder={`${fullName}'s Empire`} autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,78,0.3)" }} />
              </div>

              <p className="text-[10px]" style={{ color: "#6b8aaf" }}>
                Este será el nombre de tu espacio de trabajo. Puedes cambiarlo después.
              </p>

              {error && (
                <div className="p-3 rounded-lg text-sm text-red-300"
                  style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #d4a04e 0%, #b8860b 100%)",
                  boxShadow: "0 4px 20px rgba(212,160,78,0.3)",
                }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><Crown size={16} /> Fundar mi Imperio</>}
              </button>

              <button type="button" onClick={() => setStep(1)}
                className="w-full py-2 text-xs font-medium hover:underline" style={{ color: "#8ba4c4" }}>
                ← Volver
              </button>
            </form>
          </>
        )}
      </div>

      {/* Login link */}
      <p className="mt-6 text-sm" style={{ color: "#8ba4c4" }}>
        ¿Ya tienes un Imperio?{" "}
        <Link href="/login" className="font-medium hover:underline" style={{ color: "#d4a04e" }}>
          Iniciar Sesión
        </Link>
      </p>
    </div>
  );
}
