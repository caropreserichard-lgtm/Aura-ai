"use client";

import type { Session } from "next-auth";

// SessionProvider is not mounted globally in this app's layout.
// Using the real useSession from next-auth would crash during SSR/prerender.
// This stub returns Session | null so TypeScript resolves session?.user correctly.

interface SafeSession {
  data: Session | null;
  status: "authenticated" | "unauthenticated" | "loading";
  update: (data?: unknown) => Promise<Session | null>;
}

// Dynamic import at runtime — avoids SSR crash, gives real session on client
let _cachedHook: (() => SafeSession) | null = null;

export function useSession(): SafeSession {
  if (typeof window === "undefined") {
    // Server/prerender: return safe stub
    return { data: null, status: "unauthenticated", update: async () => null };
  }

  if (!_cachedHook) {
    // Lazy-load the real hook only on client
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("next-auth/react");
    _cachedHook = mod.useSession;
  }

  return (_cachedHook as () => SafeSession)();
}
