"use client";

import { useEffect, useMemo, useState } from "react";
import { useMissionControl } from "@/components/MissionControlProvider";
import type { EventItem } from "@/lib/types";
import {
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  TerminalSquare,
  FileText,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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

function IconForType({ type }: { type: string }) {
  const normalized = type.toLowerCase();
  const props = { size: 15, className: "flex-shrink-0" };

  if (normalized.includes("error")) {
    return <AlertTriangle {...props} className={`${props.className} text-red-400`} />;
  }
  if (normalized.includes("tool") || normalized.includes("exec")) {
    return <TerminalSquare {...props} className={`${props.className} text-cyan-400`} />;
  }
  if (normalized.includes("sync")) {
    return <RefreshCw {...props} className={`${props.className} text-blue-400`} />;
  }
  if (normalized.includes("message") || normalized.includes("ping")) {
    return <MessageSquare {...props} className={`${props.className} text-purple-400`} />;
  }
  return <FileText {...props} className={`${props.className} text-[var(--color-tertiary)]`} />;
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
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const latestTs = useMemo(() => events[events.length - 1]?.ts ?? 0, [events]);

  useEffect(() => {
    if (paused) return;

    const source = new EventSource("/api/stream");

    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as EventItem;
      onEvent?.(event);
      setEvents((prev) => {
        if (prev.find((item) => item.id === event.id)) return prev;
        setHighlighted((h) => [...h, event.id]);
        return [...prev.slice(-149), event];
      });
    };

    return () => source.close();
  }, [onEvent, paused]);

  useEffect(() => {
    if (paused) return;

    const timer = setInterval(async () => {
      const response = await fetch(`/api/events?since=${latestTs}`);
      if (!response.ok) return;
      const data = (await response.json()) as { events: EventItem[] };
      if (!data.events.length) return;

      setEvents((prev) => {
        const merged = [...prev];
        for (const event of data.events) {
          onEvent?.(event);
          if (!merged.find((item) => item.id === event.id)) {
            merged.push(event);
            setHighlighted((h) => [...h, event.id]);
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
      .sort((a, b) => (b.items[0]?.ts ?? 0) - (a.items[0]?.ts ?? 0));
  }, [filtered]);

  return (
    <section className="vulcan-card flex h-full min-h-[420px] flex-col p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-base font-semibold text-[var(--color-foreground)]">{title}</h2>
        <span
          className={`vulcan-chip text-xs font-bold ${
            paused ? "bg-amber-600/20 text-amber-300" : "bg-green-600/20 text-green-300"
          }`}
        >
          {paused ? "PAUSED" : "LIVE"}
        </span>
        <select
          className="vulcan-input w-auto"
          aria-label="Select time range"
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
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[var(--color-tertiary)]">No recent activity.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {grouped.map(({ group, items }) => {
              const isActive = (now - (items[0]?.ts ?? 0)) < 15_000;
              return (
                <motion.section
                  key={group}
                  data-testid="activity-group"
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`activity-group rounded-lg border p-2 transition-all duration-500 ${
                    isActive ? "activity-group-active border-primary/50" : "border-transparent"
                  }`}
                >
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-tertiary)]">
                    <span>{group}</span>
                    <span className="text-xs font-normal text-[var(--color-tertiary)]">{items.length} events</span>
                  </p>
                  <div className="space-y-1.5">
                    {items.slice(0, 8).map((event) => (
                      <motion.article
                        key={event.id}
                        data-testid="activity-item"
                        layout
                        initial={{ opacity: 0.5, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-md border border-transparent"
                        style={
                          highlighted.includes(event.id)
                            ? {
                                background: "var(--color-primary-12)",
                                borderColor: "var(--color-primary)",
                              }
                            : { background: "var(--color-surface)" }
                        }
                        onAnimationComplete={() =>
                          setHighlighted((h) => h.filter((id) => id !== event.id))
                        }
                      >
                        <div className="flex items-start gap-3 p-2.5">
                          <IconForType type={event.type} />
                          <div className="flex-1">
                            <p className="text-sm text-[var(--color-foreground)]">{event.summary}</p>
                            <p className="mt-1 text-xs text-[var(--color-tertiary)]">
                              {formatTime(event.ts)}
                            </p>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                </motion.section>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
