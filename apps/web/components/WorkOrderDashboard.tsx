"use client";

import { useMemo, useState } from "react";
import type { WorkOrder } from "@vulcan/shared/types";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Props {
  workOrders: WorkOrder[];
  stats: {
    total: number;
    byStatus: Record<string, number>;
    byAgent: Record<string, number>;
  };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: { label: "대기", color: "var(--color-warning)", icon: Clock },
  accepted: { label: "수락", color: "var(--color-info)", icon: ClipboardList },
  in_progress: { label: "진행중", color: "var(--color-primary)", icon: ArrowRight },
  review: { label: "검증중", color: "var(--color-chart-3)", icon: Search },
  completed: { label: "완료", color: "var(--color-success)", icon: CheckCircle2 },
  failed: { label: "실패", color: "var(--color-destructive)", icon: XCircle },
  cancelled: { label: "취소", color: "var(--color-muted-foreground)", icon: XCircle },
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "var(--color-destructive)",
  high: "var(--color-warning)",
  medium: "var(--color-primary)",
  low: "var(--color-muted-foreground)",
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        background: `color-mix(in srgb, ${config.color} 15%, transparent)`,
        color: config.color,
      }}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: PRIORITY_COLORS[priority] ?? "var(--color-muted-foreground)" }}
      title={priority}
    />
  );
}

export function WorkOrderDashboard({ workOrders, stats }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const agents = useMemo(() => {
    const set = new Set<string>();
    for (const wo of workOrders) {
      set.add(wo.toAgentId);
      set.add(wo.fromAgentId);
    }
    return Array.from(set).sort();
  }, [workOrders]);

  const filtered = useMemo(() => {
    return workOrders.filter((wo) => {
      if (statusFilter !== "all" && wo.status !== statusFilter) return false;
      if (agentFilter !== "all" && wo.toAgentId !== agentFilter && wo.fromAgentId !== agentFilter)
        return false;
      return true;
    });
  }, [workOrders, statusFilter, agentFilter]);

  const activeCount = stats.byStatus["in_progress"] ?? 0;
  const completedCount = stats.byStatus["completed"] ?? 0;
  const failedCount = stats.byStatus["failed"] ?? 0;
  const pendingCount = stats.byStatus["pending"] ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <h2 className="section-title text-xl font-semibold">WorkOrder 대시보드</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={ClipboardList} label="전체" value={stats.total} />
        <SummaryCard icon={ArrowRight} label="진행중" value={activeCount} color="var(--color-primary)" />
        <SummaryCard icon={CheckCircle2} label="완료" value={completedCount} color="var(--color-success)" />
        <SummaryCard icon={AlertTriangle} label="실패/대기" value={failedCount + pendingCount} color="var(--color-warning)" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <option value="all">모든 상태</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label} ({stats.byStatus[key] ?? 0})
            </option>
          ))}
        </select>

        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <option value="all">모든 에이전트</option>
          {agents.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* WorkOrder List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="vulcan-card rounded-xl p-8 text-center text-sm text-[var(--color-muted-foreground)]">
            WorkOrder가 없습니다
          </div>
        ) : (
          filtered.map((wo) => (
            <WorkOrderCard
              key={wo.id}
              workOrder={wo}
              now={now}
              isExpanded={expandedId === wo.id}
              onToggle={() => setExpandedId(expandedId === wo.id ? null : wo.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function WorkOrderCard({
  workOrder: wo,
  now,
  isExpanded,
  onToggle,
}: {
  workOrder: WorkOrder;
  now: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const criteria = wo.acceptanceCriteria;
  const age = now - wo.createdAt;
  const ageLabel =
    age < 3600000
      ? `${Math.floor(age / 60000)}분 전`
      : age < 86400000
        ? `${Math.floor(age / 3600000)}시간 전`
        : `${Math.floor(age / 86400000)}일 전`;

  return (
    <div className="vulcan-card rounded-xl">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-[44px] w-full items-center gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-xl"
      >
        <PriorityDot priority={wo.priority} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-[var(--color-foreground)]">
              {wo.summary}
            </span>
            <StatusBadge status={wo.status} />
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
            <span>{wo.fromAgentId} → {wo.toAgentId}</span>
            <span>{wo.type}</span>
            {wo.project && <span>{wo.project}</span>}
            <span>{ageLabel}</span>
            {wo.retryCount > 0 && (
              <span className="flex items-center gap-0.5 text-[var(--color-warning)]">
                <RotateCcw size={10} /> {wo.retryCount}
              </span>
            )}
          </div>
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className="border-t border-[var(--color-border)] px-4 pb-4 pt-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* 수락 기준 — 기본 접힘 */}
            {criteria.length > 0 && (
              <details>
                <summary className="cursor-pointer py-2 min-h-[44px] text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                  수락 기준 ({criteria.length})
                </summary>
                <ul className="mt-1 space-y-1">
                  {criteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-[var(--color-foreground)]">
                      <span className="mt-0.5 text-[var(--color-muted-foreground)]">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="space-y-2">
              <div>
                <span className="text-xs text-[var(--color-muted-foreground)]">타임아웃: </span>
                <span className="text-xs text-[var(--color-foreground)]">{wo.timeoutSeconds}초</span>
              </div>
              {wo.verifierAgentId && (
                <div>
                  <span className="text-xs text-[var(--color-muted-foreground)]">검증자: </span>
                  <span className="text-xs text-[var(--color-foreground)]">{wo.verifierAgentId}</span>
                </div>
              )}
              {wo.linkedTaskId && (
                <div>
                  <span className="text-xs text-[var(--color-muted-foreground)]">연결 태스크: </span>
                  <span className="text-xs text-[var(--color-foreground)]">{wo.linkedTaskId}</span>
                </div>
              )}
              <div>
                <span className="text-xs text-[var(--color-muted-foreground)]">ID: </span>
                <span className="text-xs font-mono text-[var(--color-muted-foreground)]">
                  {wo.id.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="vulcan-card rounded-xl p-4">
      <div className="flex items-center gap-2">
        <Icon size={16} style={{ color: color ?? "var(--color-primary)" }} />
        <span className="text-xs text-[var(--color-muted-foreground)]">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">{value}</p>
    </div>
  );
}
