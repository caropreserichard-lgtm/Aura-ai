"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import TayronaLogo from "@/components/TayronaLogo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email o contraseña incorrectos");
      } else {
        router.push("/home");
        router.refresh();
      }
    } catch {
      setError("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center">
      {/* Logo & Title */}
      <div className="mb-8">
        <div className="mx-auto mb-4 flex items-center justify-center" style={{ filter: "drop-shadow(0 0 20px rgba(212,160,78,0.4))" }}>
          <TayronaLogo size={80} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">Tayrona AI</h1>
        <p className="text-sm" style={{ color: "#8ba4c4" }}>Tu Ciudad Perdida de la Productividad</p>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border p-6"
        style={{
          background: "rgba(15, 25, 45, 0.8)",
          borderColor: "rgba(74, 144, 217, 0.15)",
          backdropFilter: "blur(20px)",
        }}>
        <h2 className="text-xl font-semibold text-white mb-6">Iniciar Sesión</h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm text-red-300"
            style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b8aaf" }} />
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" required autoFocus
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(74,144,217,0.2)" }}
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b8aaf" }} />
            <input
              type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña" required
              className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(74,144,217,0.2)" }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #d4a04e 0%, #b8860b 100%)",
              boxShadow: "0 4px 20px rgba(212,160,78,0.3)",
            }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Entrar a tu Imperio</span><ArrowRight size={16} /></>}
          </button>
        </form>
      </div>

      {/* Register link */}
      <p className="mt-6 text-sm" style={{ color: "#8ba4c4" }}>
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="font-medium hover:underline" style={{ color: "#d4a04e" }}>
          Construye tu Imperio
        </Link>
      </p>
    </div>
  );
}
