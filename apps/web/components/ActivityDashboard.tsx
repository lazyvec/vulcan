"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { ActivityStats, Agent, EventItem, AuditLogItem } from "@/lib/types";
import { Activity, AlertTriangle, Clock, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { eventCategoryColorMap } from "@/lib/ui-utils";

interface Props {
  initialStats: ActivityStats;
  initialEvents: EventItem[];
  initialTotal: number;
  agents: Agent[];
}

const CATEGORY_FILTERS = [
  { key: "error", label: "에러" },
  { key: "agent", label: "에이전트" },
  { key: "task", label: "태스크" },
] as const;

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatHourLabel(hour: string) {
  const parts = hour.split(" ");
  return parts[1] ?? hour;
}

function eventCategoryOf(type: string): string {
  if (type.startsWith("error") || type.includes("failed")) return "error";
  if (type.startsWith("agent")) return "agent";
  if (type.startsWith("task")) return "task";
  return "other";
}

export function ActivityDashboard({ initialStats, initialEvents, initialTotal, agents }: Props) {
  const [stats] = useState(initialStats);
  const [events, setEvents] = useState(initialEvents);
  const [total] = useState(initialTotal);
  const [feedTab, setFeedTab] = useState("events");
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const agentMap = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const filteredEvents = useMemo(() => {
    if (!categoryFilter) return events;
    return events.filter((e) => eventCategoryOf(e.type) === categoryFilter);
  }, [events, categoryFilter]);

  const loadAudit = useCallback(async () => {
    if (auditLoaded) return;
    setLoading(true);
    try {
      const res = await fetch("/api/audit?limit=50");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs ?? []);
        setAuditTotal(data.total ?? data.logs?.length ?? 0);
        setAuditLoaded(true);
      }
    } finally { setLoading(false); }
  }, [auditLoaded]);

  const loadMoreEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/activity?limit=50&offset=${events.length}`);
      if (res.ok) {
        const data = await res.json();
        setEvents((prev) => [...prev, ...data.events]);
      }
    } finally { setLoading(false); }
  }, [events.length]);

  const loadMoreAudit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit?limit=50&offset=${auditLogs.length}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs((prev) => [...prev, ...data.logs]);
      }
    } finally { setLoading(false); }
  }, [auditLogs.length]);

  const tooltipStyle = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    color: "var(--color-foreground)",
    fontSize: 12,
  };

  return (
    <div className="space-y-6">
      {/* Metric cards — 2개 */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="이벤트 (24h)" value={stats.totalEvents} icon={<Activity size={18} />} />
        <MetricCard label="에러" value={stats.errorCount} icon={<AlertTriangle size={18} />} variant={stats.errorCount > 0 ? "error" : "neutral"} />
      </div>

      {/* 시간대별 이벤트 차트 */}
      <div className="vulcan-card p-4">
        <h3 className="section-title mb-3">시간대별 이벤트</h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.byHour}>
              <XAxis dataKey="hour" tickFormatter={formatHourLabel} tick={{ fill: "var(--color-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--color-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feed */}
      <div className="vulcan-card p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Tabs
            items={[
              { key: "events", label: "이벤트", count: total },
              { key: "audit", label: "감사 로그", count: auditLoaded ? auditTotal : undefined },
            ]}
            activeKey={feedTab}
            onChange={(key) => {
              setFeedTab(key);
              if (key === "audit") void loadAudit();
            }}
          />

          {feedTab === "events" && (
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <Filter size={14} className="text-[var(--color-tertiary)]" />
              <button
                className={`vulcan-chip min-h-[44px] text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${!categoryFilter ? "bg-[var(--color-surface-hover)] text-[var(--color-foreground)]" : ""}`}
                onClick={() => setCategoryFilter(null)}
              >
                전체
              </button>
              {CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat.key}
                  className={`vulcan-chip min-h-[44px] text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${categoryFilter === cat.key ? "bg-[var(--color-surface-hover)] text-[var(--color-foreground)]" : ""}`}
                  onClick={() => setCategoryFilter(cat.key === categoryFilter ? null : cat.key)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Events Feed */}
        {feedTab === "events" && (
          <div className="space-y-1.5">
            {filteredEvents.length === 0 ? (
              <EmptyState message="이벤트 없음" />
            ) : (
              filteredEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 rounded-md bg-[var(--color-surface)] p-2.5">
                  <Badge status={eventCategoryColorMap[eventCategoryOf(event.type)] ?? "neutral"} className="mt-0.5">
                    {eventCategoryOf(event.type)}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--color-foreground)]">{event.summary}</p>
                    <p className="mt-0.5 flex flex-wrap gap-2 text-xs text-[var(--color-tertiary)]">
                      <span>{formatTime(event.ts)}</span>
                      <span className="font-mono">{event.type}</span>
                      {event.agentId && (
                        <Link href="/team" className="text-[var(--color-primary)] hover:underline">
                          {agentMap.get(event.agentId)?.name ?? event.agentId.slice(0, 8)}
                        </Link>
                      )}
                      {event.taskId && (
                        <Link href="/tasks" className="text-[var(--color-primary)] hover:underline">Task</Link>
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
            {filteredEvents.length < total && (
              <Button variant="secondary" className="mt-2 w-full" onClick={loadMoreEvents} disabled={loading} loading={loading}>
                더 보기
              </Button>
            )}
          </div>
        )}

        {/* Audit Feed */}
        {feedTab === "audit" && (
          <div className="space-y-1.5">
            {!auditLoaded ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-[var(--color-tertiary)]" />
              </div>
            ) : auditLogs.length === 0 ? (
              <EmptyState message="감사 로그 없음" />
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-md bg-[var(--color-surface)] p-2.5">
                  <Clock size={14} className="mt-0.5 shrink-0 text-[var(--color-tertiary)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--color-foreground)]">
                      <span className="font-semibold">{log.action}</span> on{" "}
                      <span className="font-mono text-xs">{log.entityType}</span>
                      {log.entityId && <span className="ml-1 font-mono text-xs text-[var(--color-tertiary)]">{log.entityId.slice(0, 8)}</span>}
                    </p>
                    <p className="mt-0.5 flex gap-2 text-xs text-[var(--color-tertiary)]">
                      <span>{formatTime(log.ts)}</span>
                      <span>{log.actor}</span>
                      <span>{log.source}</span>
                    </p>
                  </div>
                </div>
              ))
            )}
            {auditLoaded && auditLogs.length < auditTotal && (
              <Button variant="secondary" className="mt-2 w-full" onClick={loadMoreAudit} disabled={loading} loading={loading}>
                더 보기
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, variant = "neutral" }: { label: string; value: number | string; icon: React.ReactNode; variant?: "neutral" | "error" | "warning" }) {
  const colorClass = variant === "error" ? "text-[var(--color-destructive-text)]" : variant === "warning" ? "text-[var(--color-warning-text)]" : "text-[var(--color-foreground)]";
  return (
    <div className="vulcan-card flex items-center gap-3 p-4">
      <div className="text-[var(--color-tertiary)]">{icon}</div>
      <div>
        <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
        <p className="caption-text">{label}</p>
      </div>
    </div>
  );
}
