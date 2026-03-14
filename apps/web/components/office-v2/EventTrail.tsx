"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EventItem } from "@/lib/types";
import { useVulcanWebSocket } from "@/hooks/useWebSocket";

const MAX_EVENTS = 10;

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function eventTypeIcon(type: string): string {
  if (type.includes("error")) return "!!";
  if (type.includes("exec") || type.includes("tool")) return ">_";
  if (type.includes("research") || type.includes("search")) return "??";
  if (type.includes("message") || type.includes("write")) return "Aa";
  if (type.includes("sync")) return "<>";
  if (type.includes("task")) return "[]";
  if (type.includes("command")) return "!>";
  if (type.includes("agent")) return "@@";
  return "..";
}

export function EventTrail() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const initialFetchedRef = useRef(false);

  const handleEvent = useCallback((event: EventItem) => {
    setEvents((prev) => {
      // id 기반 중복 제거
      if (prev.some((e) => e.id === event.id)) return prev;
      return [event, ...prev].slice(0, MAX_EVENTS);
    });
  }, []);

  useVulcanWebSocket({ paused: false, onEvent: handleEvent });

  // 초기 이벤트 로드
  useEffect(() => {
    if (initialFetchedRef.current) return;
    initialFetchedRef.current = true;

    fetch("/api/events")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.events) {
          setEvents(data.events.slice(-MAX_EVENTS).reverse());
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="rounded-xl border border-glass-border bg-[var(--color-surface)] p-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
        Event Trail
      </span>

      <div className="mt-2 space-y-0.5" aria-live="polite" aria-label="최근 이벤트 목록">
        {events.length > 0 ? (
          events.map((ev) => (
            <div
              key={ev.id}
              className="flex items-start gap-1.5 rounded-md px-1.5 py-1 hover:bg-[var(--color-background)]/40 transition-colors"
            >
              <span className="mt-0.5 shrink-0 rounded bg-[var(--color-background)] px-1 py-0.5 text-[8px] font-mono font-bold text-[var(--color-muted-foreground)]">
                {eventTypeIcon(ev.type)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-medium text-[var(--color-foreground)]">
                  {ev.summary || ev.type}
                </p>
                <p className="text-[8px] text-[var(--color-muted-foreground)] opacity-70">
                  {ev.agentId ? `${ev.agentId} · ` : ""}{formatTime(ev.ts)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-[10px] text-[var(--color-muted-foreground)] opacity-40">
            이벤트 대기 중...
          </p>
        )}
      </div>
    </div>
  );
}
