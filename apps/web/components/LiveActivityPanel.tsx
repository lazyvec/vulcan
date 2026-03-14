"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMissionControl } from "@/components/MissionControlProvider";
import { useVulcanWebSocket } from "@/hooks/useWebSocket";
import type { EventItem } from "@/lib/types";
import { eventCategoryOf } from "@vulcan/shared/constants";
import {
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  TerminalSquare,
  FileText,
  Radio,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMounted } from "@/hooks/useMounted";

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

const CORE_FILTERS = [
  { key: "system", label: "에러" },
  { key: "agent", label: "에이전트" },
  { key: "task", label: "태스크" },
] as const;

function IconForType({ type }: { type: string }) {
  const cat = eventCategoryOf(type);
  const color =
    cat === "system" ? "text-[var(--color-primary)]" :
    cat === "agent" ? "text-[var(--color-success-text)]" :
    cat === "task" ? "text-[var(--color-info-text)]" :
    cat === "command" ? "text-[var(--color-warning-text)]" :
    "text-[var(--color-tertiary)]";
  const props = { size: 15, className: `flex-shrink-0 ${color}` };

  if (type.includes("error") || type === "command.failed") return <AlertTriangle {...props} />;
  if (type.includes("sync")) return <RefreshCw {...props} />;
  if (type.includes("message") || type.includes("ping")) return <MessageSquare {...props} />;
  if (type.includes("tool") || type.includes("exec")) return <TerminalSquare {...props} />;
  if (type.includes("health") || type === "ping") return <Radio {...props} />;
  return <FileText {...props} />;
}

function rangeStart(range: ActivityRange) {
  const now = Date.now();
  if (range === "1h") return now - 60 * 60_000;
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return 0;
}

export function LiveActivityPanel({
  initialEvents,
  title = "라이브 활동",
  onEvent,
}: LiveActivityPanelProps) {
  const mounted = useMounted();
  const { paused } = useMissionControl();
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [range, setRange] = useState<ActivityRange>("1h");
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const latestTs = useMemo(() => events[events.length - 1]?.ts ?? 0, [events]);
  const pushEvent = useCallback(
    (event: EventItem) => {
      onEvent?.(event);
      setEvents((prev) => {
        if (prev.find((item) => item.id === event.id)) return prev;
        setHighlighted((current) => [...current, event.id]);
        return [...prev.slice(-49), event];
      });
    },
    [onEvent],
  );

  const { connected: wsConnected } = useVulcanWebSocket({
    paused,
    onEvent: pushEvent,
  });

  useEffect(() => {
    if (paused || wsConnected) return;
    const timer = setInterval(async () => {
      const response = await fetch(`/api/events?since=${latestTs}`);
      if (!response.ok) return;
      const data = (await response.json()) as { events: EventItem[] };
      if (!data.events.length) return;
      for (const event of data.events) pushEvent(event);
    }, 8000);
    return () => clearInterval(timer);
  }, [latestTs, paused, pushEvent, wsConnected]);

  // 시간 + 카테고리 필터
  const filtered = useMemo(() => {
    const start = rangeStart(range);
    return events.filter((event) => {
      if (event.ts < start) return false;
      if (categoryFilters.size === 0) return true;
      return categoryFilters.has(eventCategoryOf(event.type));
    });
  }, [events, range, categoryFilters]);

  // 통계 요약 — 1분 간격 갱신
  const [statsNow, setStatsNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setStatsNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const summaryStats = useMemo(() => {
    const oneHourAgo = statsNow - 60 * 60_000;
    const recent = events.filter((e) => e.ts >= oneHourAgo);
    const errors = recent.filter(
      (e) => e.type.includes("error") || e.type === "command.failed",
    );
    return { total: recent.length, errors: errors.length };
  }, [events, statsNow]);

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

  const toggleCategory = (cat: string) => {
    setCategoryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <section className="vulcan-card flex h-full flex-col p-4 lg:min-h-[420px]">
      {/* 헤더 */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-base font-semibold text-[var(--color-foreground)]">{title}</h2>
        <span className="text-xs text-[var(--color-tertiary)]">
          {summaryStats.total}건
          {summaryStats.errors > 0 && (
            <span className="ml-1 text-[var(--color-destructive-text)]">
              · 에러 {summaryStats.errors}건
            </span>
          )}
          {" (1시간)"}
        </span>
        <span
          className={`vulcan-chip text-xs font-bold ${
            paused
              ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"
              : wsConnected
                ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]"
                : "bg-[var(--color-info-bg)] text-[var(--color-info-text)]"
          }`}
        >
          {paused ? "일시정지" : wsConnected ? "라이브 · WS" : "라이브 · 폴링"}
        </span>
        <select
          className="vulcan-input w-auto min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          aria-label="시간 범위 선택"
          value={range}
          onChange={(event) => setRange(event.target.value as ActivityRange)}
        >
          <option value="1h">지난 1시간</option>
          <option value="today">오늘</option>
          <option value="all">전체</option>
        </select>
      </div>

      {/* 카테고리 필터 칩 */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CORE_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`vulcan-chip min-h-[44px] text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
              categoryFilters.has(f.key)
                ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                : "opacity-60 hover:opacity-100"
            }`}
            onClick={() => toggleCategory(f.key)}
          >
            {f.label}
          </button>
        ))}
        {categoryFilters.size > 0 && (
          <button
            className="vulcan-chip min-h-[44px] text-[10px] text-[var(--color-destructive-text)] hover:bg-[var(--color-destructive-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-destructive)]"
            onClick={() => setCategoryFilters(new Set())}
          >
            초기화
          </button>
        )}
      </div>

      {/* 이벤트 목록 */}
      <div className="space-y-3 overflow-auto pr-1">
        {grouped.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[var(--color-tertiary)]">최근 활동이 없습니다.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {mounted && grouped.map(({ group, items }) => {
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
                    <Link
                      href="/team"
                      className="hover:text-[var(--color-primary)] hover:underline"
                    >
                      {group}
                    </Link>
                    <span className="text-xs font-normal text-[var(--color-tertiary)]">
                      {items.length}건
                    </span>
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
                                background: "var(--color-primary-bg)",
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
                            <p className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-tertiary)]">
                              <span suppressHydrationWarning>{formatTime(event.ts)}</span>
                              {event.agentId && (
                                <Link
                                  href="/team"
                                  className="text-[var(--color-primary)] hover:underline"
                                >
                                  {event.agentId.slice(0, 8)}
                                </Link>
                              )}
                              {event.taskId && (
                                <Link
                                  href="/tasks"
                                  className="text-[var(--color-primary)] hover:underline"
                                >
                                  태스크
                                </Link>
                              )}
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
