"use client";

// SessionProvider is not configured in this app's layout.
// useSession from next-auth returns undefined without it, crashing the build.
// This stub returns an empty session so profile page renders safely.
export function useSession() {
  return { data: null as null, status: "unauthenticated" as const, update: async (_?: unknown) => null };
}
