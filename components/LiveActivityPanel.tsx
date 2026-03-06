"use client";

import { useEffect, useMemo, useState } from "react";
import { useMissionControl } from "@/components/MissionControlProvider";
import type { EventItem } from "@/lib/types";

type ActivityRange = "1h" | "today" | "all";

interface LiveActivityPanelProps {
  initialEvents: EventItem[];
  title?: string;
  onEvent?: (event: EventItem) => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function iconForType(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("error")) {
    return "!";
  }
  if (normalized.includes("tool") || normalized.includes("exec")) {
    return "[]";
  }
  if (normalized.includes("sync")) {
    return "~~";
  }
  if (normalized.includes("message") || normalized.includes("ping")) {
    return ">>";
  }
  return "..";
}

function rangeStart(range: ActivityRange) {
  const now = Date.now();
  if (range === "1h") {
    return now - 60 * 60_000;
  }
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return 0;
}

export function LiveActivityPanel({
  initialEvents,
  title = "Live Activity",
  onEvent,
}: LiveActivityPanelProps) {
  const { paused } = useMissionControl();
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [range, setRange] = useState<ActivityRange>("1h");

  const latestTs = useMemo(() => events[events.length - 1]?.ts ?? 0, [events]);

  useEffect(() => {
    if (paused) {
      return;
    }

    const source = new EventSource("/api/stream");

    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as EventItem;
      onEvent?.(event);
      setEvents((prev) => {
        if (prev.find((item) => item.id === event.id)) {
          return prev;
        }
        return [...prev.slice(-149), event];
      });
    };

    return () => {
      source.close();
    };
  }, [onEvent, paused]);

  useEffect(() => {
    if (paused) {
      return;
    }

    const timer = setInterval(async () => {
      const response = await fetch(`/api/events?since=${latestTs}`);
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { events: EventItem[] };
      if (!data.events.length) {
        return;
      }

      setEvents((prev) => {
        const merged = [...prev];
        for (const event of data.events) {
          onEvent?.(event);
          if (!merged.find((item) => item.id === event.id)) {
            merged.push(event);
          }
        }
        return merged.slice(-150);
      });
    }, 8000);

    return () => clearInterval(timer);
  }, [latestTs, onEvent, paused]);

  const filtered = useMemo(() => {
    const start = rangeStart(range);
    return events.filter((event) => event.ts >= start);
  }, [events, range]);

  const grouped = useMemo(() => {
    const groups = new Map<string, EventItem[]>();

    for (const event of filtered) {
      const key = event.agentId ?? event.source;
      const bucket = groups.get(key) ?? [];
      bucket.push(event);
      groups.set(key, bucket);
    }

    return Array.from(groups.entries())
      .map(([group, items]) => ({ group, items: items.slice().reverse() }))
      .sort((a, b) => {
        const aTs = a.items[0]?.ts ?? 0;
        const bTs = b.items[0]?.ts ?? 0;
        return bTs - aTs;
      });
  }, [filtered]);

  return (
    <section className="vulcan-card flex h-full min-h-[420px] flex-col p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-semibold text-[var(--color-foreground)]">{title}</h2>
        <span className="vulcan-chip">{paused ? "PAUSED" : "SSE"}</span>
        <select
          className="vulcan-input w-28"
          value={range}
          onChange={(event) => setRange(event.target.value as ActivityRange)}
        >
          <option value="1h">Last hour</option>
          <option value="today">Today</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="space-y-3 overflow-auto pr-1">
        {grouped.length === 0 ? (
          <p className="rounded-[var(--radius-control)] border px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
            No recent activity
          </p>
        ) : (
          grouped.map(({ group, items }) => {
            const isActive = (latestTs - (items[0]?.ts ?? 0)) < 60_000;
            return (
              <section
                key={group}
                data-testid="activity-group"
                data-agent-group={group}
                className={`activity-group rounded-[var(--radius-control)] border p-2 ${
                  isActive ? "activity-group-active" : ""
                }`}
              >
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-tertiary)]">
                  <span>{group}</span>
                  <span className="vulcan-chip">{items.length}</span>
                </p>
              <div className="space-y-2">
                {items.slice(0, 6).map((event) => (
                  <article
                    key={event.id}
                    data-testid="activity-item"
                    className="fade-in-up rounded-[var(--radius-control)] border px-3 py-2"
                    style={{ borderColor: "var(--color-border)", background: "rgba(41,37,36,0.35)" }}
                  >
                    <p className="text-xs text-[var(--color-tertiary)]">
                      {formatTime(event.ts)} · {iconForType(event.type)} · {event.type}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-foreground)]">{event.summary}</p>
                  </article>
                ))}
              </div>
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}
