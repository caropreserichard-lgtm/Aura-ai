"use client";

import { Suspense } from "react";
import DeepWorkView from "@/components/DeepWorkView";

export default function DeepWorkPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-bg-primary flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      }
    >
      <DeepWorkView />
    </Suspense>
  );
}
