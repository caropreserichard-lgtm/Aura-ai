"use client";

import TimerWidget from "./TimerWidget";

export default function GlobalTimerProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TimerWidget />
    </>
  );
}
