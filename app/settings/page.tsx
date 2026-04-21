"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Redirector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams({ tab: "general" });
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success) params.set("success", success);
    if (error) params.set("error", error);
    router.replace(`/profile?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary">
      <div className="w-8 h-8 border-4 border-[#e7ca79]/30 border-t-[#e7ca79] rounded-full animate-spin" />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="w-8 h-8 border-4 border-[#e7ca79]/30 border-t-[#e7ca79] rounded-full animate-spin" />
      </div>
    }>
      <Redirector />
    </Suspense>
  );
}
