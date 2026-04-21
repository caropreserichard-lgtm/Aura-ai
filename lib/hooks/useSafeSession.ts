"use client";

import { useSession as useNextSession } from "next-auth/react";

// Wraps next-auth useSession so it doesn't throw when SessionProvider is absent
export function useSession() {
  try {
    return useNextSession();
  } catch {
    return { data: null, status: "unauthenticated" as const, update: async () => null };
  }
}
