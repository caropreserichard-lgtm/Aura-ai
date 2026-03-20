"use client";

import { useState, useEffect } from "react";
import { Calendar, ExternalLink } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  isRickyFlow: boolean;
}

export default function CalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/calendar/events")
      .then((r) => r.json())
      .then((data) => {
        setConnected(data.connected || false);
        setEvents(data.events || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg bg-bg-secondary border border-border p-4">
        <div className="h-6 w-32 bg-bg-tertiary rounded animate-pulse mb-3" />
        <div className="space-y-2">
          <div className="h-10 bg-bg-tertiary rounded-lg animate-pulse" />
          <div className="h-10 bg-bg-tertiary rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="rounded-lg bg-bg-secondary border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={16} className="text-secondary" />
          <h3 className="font-heading font-bold text-sm">Calendario</h3>
        </div>
        <a
          href="/settings"
          className="text-xs text-secondary hover:underline"
        >
          Conectar Google Calendar →
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-bg-secondary border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-secondary" />
          <h3 className="font-heading font-bold text-sm">Pr&oacute;ximos eventos</h3>
        </div>
        <span className="text-xs text-text-muted">{events.length}</span>
      </div>

      {events.length === 0 ? (
        <p className="text-xs text-text-muted py-2">
          No hay eventos pr&oacute;ximos
        </p>
      ) : (
        <div className="space-y-2">
          {events.slice(0, 5).map((event) => {
            const start = new Date(event.start);
            const isToday =
              start.toDateString() === new Date().toDateString();

            return (
              <div
                key={event.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  event.isRickyFlow
                    ? "bg-accent/5 border border-accent/10"
                    : "bg-bg-tertiary"
                }`}
              >
                <div className="text-center min-w-[40px]">
                  <p className="text-[10px] text-text-muted">
                    {isToday
                      ? "Hoy"
                      : start.toLocaleDateString("es", { weekday: "short" })}
                  </p>
                  <p className="text-xs font-mono font-bold text-text-primary">
                    {start.toLocaleTimeString("es", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary truncate">
                    {event.isRickyFlow
                      ? event.title.replace("[RF] ", "")
                      : event.title}
                  </p>
                </div>
                {event.isRickyFlow && (
                  <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                    RF
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
