"use client";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 30%, #242424 60%, #121212 100%)",
      }}>
      {/* Ambient glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #e7ca79 0%, transparent 70%)" }} />
      <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, #e7ca79 0%, transparent 70%)" }} />

      {/* Stars effect */}
      <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(1px 1px at 20px 30px, white, transparent), radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent), radial-gradient(1px 1px at 90px 40px, white, transparent), radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.6), transparent), radial-gradient(1px 1px at 160px 30px, white, transparent)",
          backgroundSize: "200px 100px",
        }} />

      <div className="relative z-10 w-full max-w-md mx-4">
        {children}
      </div>
    </div>
  );
}
