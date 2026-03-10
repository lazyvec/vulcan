"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, eventCategoryOf } from "@vulcan/shared/constants";
import type { ActivityStats, Agent, EventItem, AuditLogItem } from "@/lib/types";
import { Activity, AlertTriangle, Bot, CheckCircle2, Clock, Filter, Loader2 } from "lucide-react";
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

const PIE_COLORS = [
  "var(--color-primary)", "#3b82f6", "#10b981", "#8b5cf6",
  "#f59e0b", "#ef4444", "#06b6d4", "#ec4899",
];

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatHourLabel(hour: string) {
  const parts = hour.split(" ");
  return parts[1] ?? hour;
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

  const activeAgentCount = useMemo(() => Object.keys(stats.byAgent).length, [stats.byAgent]);

  const commandSuccessRate = useMemo(() => {
    const sent = stats.byType["command.sent"] ?? 0;
    const failed = stats.byType["command.failed"] ?? 0;
    const t = sent + failed;
    if (t === 0) return 100;
    return Math.round((sent / t) * 100);
  }, [stats.byType]);

  const typeDistribution = useMemo(() =>
    Object.entries(stats.byType)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    [stats.byType],
  );

  const agentDistribution = useMemo(() =>
    Object.entries(stats.byAgent)
      .map(([id, value]) => ({ name: agentMap.get(id)?.name ?? id.slice(0, 8), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    [stats.byAgent, agentMap],
  );

  const filteredEvents = useMemo(() => {
    if (!categoryFilter) return events;
    const types = EVENT_CATEGORIES[categoryFilter];
    if (!types) return events;
    return events.filter((e) => (types as readonly string[]).includes(e.type));
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
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="이벤트 (24h)" value={stats.totalEvents} icon={<Activity size={18} />} />
        <MetricCard label="활성 에이전트" value={activeAgentCount} icon={<Bot size={18} />} />
        <MetricCard label="에러" value={stats.errorCount} icon={<AlertTriangle size={18} />} variant={stats.errorCount > 0 ? "error" : "neutral"} />
        <MetricCard label="커맨드 성공률" value={`${commandSuccessRate}%`} icon={<CheckCircle2 size={18} />} variant={commandSuccessRate < 80 ? "warning" : "neutral"} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="vulcan-card col-span-full p-4 lg:col-span-2">
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

        <div className="vulcan-card p-4">
          <h3 className="section-title mb-3">에이전트별 활동</h3>
          <div className="h-[200px]">
            {agentDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={agentDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2} label={({ name }) => name}>
                    {agentDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="데이터 없음" className="h-full" />
            )}
          </div>
        </div>

        <div className="vulcan-card col-span-full p-4">
          <h3 className="section-title mb-3">이벤트 타입 분포 (Top 10)</h3>
          <div className="h-[220px]">
            {typeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeDistribution} layout="vertical">
                  <XAxis type="number" tick={{ fill: "var(--color-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "var(--color-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="var(--color-info)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="데이터 없음" className="h-full" />
            )}
          </div>
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
                className={`vulcan-chip text-xs ${!categoryFilter ? "bg-[var(--color-surface-hover)] text-[var(--color-foreground)]" : ""}`}
                onClick={() => setCategoryFilter(null)}
              >
                전체
              </button>
              {Object.keys(EVENT_CATEGORIES).map((cat) => (
                <button
                  key={cat}
                  className={`vulcan-chip text-xs ${categoryFilter === cat ? "bg-[var(--color-surface-hover)] text-[var(--color-foreground)]" : ""}`}
                  onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                >
                  {EVENT_CATEGORY_LABELS[cat] ?? cat}
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
