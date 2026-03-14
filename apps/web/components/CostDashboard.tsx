"use client";

import { useCallback, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { CircuitBreakerConfig, DailyCostSummary } from "@vulcan/shared/types";
import type { CBHistoryItem } from "@/lib/api-server";
import { DollarSign, Cpu, Zap, TrendingUp, TrendingDown, Minus, ShieldAlert } from "lucide-react";

const PERIOD_OPTIONS = [
  { days: 7, label: "7일" },
  { days: 14, label: "14일" },
  { days: 30, label: "30일" },
] as const;

interface Props {
  summaries: DailyCostSummary[];
  cbConfigs: CircuitBreakerConfig[];
  cbHistory: CBHistoryItem[];
  initialDays?: number;
}

const AGENT_COLORS: Record<string, string> = {
  hermes: "var(--color-chart-1)",
  daedalus: "var(--color-chart-2)",
  metis: "var(--color-chart-3)",
  athena: "var(--color-chart-4)",
  themis: "var(--color-chart-5)",
  iris: "var(--color-chart-6)",
  nike: "var(--color-chart-7)",
  calliope: "var(--color-chart-8)",
  aegis: "var(--color-primary)",
  argus: "var(--color-tertiary)",
};

function getAgentColor(agentId: string) {
  return AGENT_COLORS[agentId] ?? "var(--color-muted-foreground)";
}

export function CostDashboard({ summaries: initialSummaries, cbConfigs, cbHistory, initialDays = 7 }: Props) {
  const [selectedDays, setSelectedDays] = useState(initialDays);
  const [summaries, setSummaries] = useState(initialSummaries);
  const [loading, setLoading] = useState(false);

  const handlePeriodChange = useCallback(async (days: number) => {
    setSelectedDays(days);
    setLoading(true);
    try {
      const res = await fetch(`/api/traces/daily-cost?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setSummaries(data.summaries ?? []);
      }
    } catch { /* 실패 시 유지 */ } finally {
      setLoading(false);
    }
  }, []);

  const totalCost = useMemo(
    () => summaries.reduce((sum, s) => sum + s.totalCost, 0),
    [summaries],
  );
  const totalTokens = useMemo(
    () => summaries.reduce((sum, s) => sum + s.totalInputTokens + s.totalOutputTokens, 0),
    [summaries],
  );
  const totalCalls = useMemo(
    () => summaries.reduce((sum, s) => sum + s.callCount, 0),
    [summaries],
  );

  const trend = useMemo(() => {
    if (summaries.length === 0) return { ratio: 0, direction: "flat" as const };
    const sorted = [...summaries].sort((a, b) => a.date.localeCompare(b.date));
    const mid = Math.floor(sorted.length / 2);
    if (mid === 0) return { ratio: 0, direction: "flat" as const };
    const firstHalf = sorted.slice(0, mid).reduce((s, d) => s + d.totalCost, 0);
    const secondHalf = sorted.slice(mid).reduce((s, d) => s + d.totalCost, 0);
    if (firstHalf === 0) return { ratio: 0, direction: "flat" as const };
    const ratio = ((secondHalf - firstHalf) / firstHalf) * 100;
    return {
      ratio: Math.abs(ratio),
      direction: ratio > 5 ? ("up" as const) : ratio < -5 ? ("down" as const) : ("flat" as const),
    };
  }, [summaries]);

  // 에이전트별 합계 → 텍스트 요약
  const agentSummaryText = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of summaries) {
      map.set(s.agentId, (map.get(s.agentId) ?? 0) + s.totalCost);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, cost]) => `${id} $${cost.toFixed(2)}`)
      .join(", ");
  }, [summaries]);

  // 일별 합계 (BarChart)
  const byDate = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    const agents = new Set<string>();
    for (const s of summaries) {
      agents.add(s.agentId);
      const prev = map.get(s.date) ?? {};
      prev[s.agentId] = (prev[s.agentId] ?? 0) + s.totalCost;
      map.set(s.date, prev);
    }
    return {
      data: Array.from(map.entries())
        .map(([date, costs]) => ({ date, ...costs }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      agents: Array.from(agents).sort(),
    };
  }, [summaries]);

  const cbActiveCount = useMemo(
    () => cbConfigs.filter((c) => c.isActive).length,
    [cbConfigs],
  );

  const recentCbHistory = cbHistory.slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* 헤더 + 기간 선택기 */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto section-title text-xl font-semibold">비용 대시보드</h2>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              className={`rounded-md px-3 py-1 min-h-[44px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                selectedDays === opt.days
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              }`}
              onClick={() => void handlePeriodChange(opt.days)}
              disabled={loading}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {loading && (
          <span className="text-xs text-[var(--color-muted-foreground)]">로딩...</span>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={DollarSign} label={`총 비용 (${selectedDays}일)`} value={`$${totalCost.toFixed(4)}`} />
        <MetricCard icon={Cpu} label="총 토큰" value={totalTokens.toLocaleString()} />
        <MetricCard icon={Zap} label="총 호출" value={totalCalls.toLocaleString()} />
        <MetricCard
          icon={trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus}
          label="비용 트렌드"
          value={`${trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : ""}${trend.ratio.toFixed(1)}%`}
          valueColor={
            trend.direction === "up" ? "var(--color-destructive)" : trend.direction === "down" ? "var(--color-success)" : undefined
          }
        />
      </div>

      {/* 일별 비용 BarChart */}
      <div className="vulcan-card rounded-xl p-4">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-foreground)]">일별 비용</h3>
        {byDate.data.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byDate.data}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-background)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [`$${value.toFixed(4)}`, ""]}
              />
              {byDate.agents.map((agentId) => (
                <Bar key={agentId} dataKey={agentId} stackId="cost" fill={getAgentColor(agentId)} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-sm text-[var(--color-muted-foreground)]">데이터 없음</p>
        )}
        {/* 에이전트별 요약 (텍스트) */}
        {agentSummaryText && (
          <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">{agentSummaryText}</p>
        )}
      </div>

      {/* CB 요약 카드 + 최근 이력 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="vulcan-card rounded-xl p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
            <ShieldAlert size={16} className="text-[var(--color-destructive)]" />
            Circuit Breaker
          </h3>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{cbActiveCount}개 활성</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {cbConfigs.map((c) => `${c.agentId}: ${c.dailyTokenLimit.toLocaleString()}tok`).join(" · ") || "설정 없음"}
          </p>
        </div>

        <div className="vulcan-card rounded-xl p-4">
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-foreground)]">CB 최근 발동</h3>
          {recentCbHistory.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">발동 이력 없음</p>
          ) : (
            <div className="space-y-1">
              {recentCbHistory.map((h, i) => (
                <div key={`${h.date}-${h.agentId}-${i}`} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-foreground)]">{h.date} · {h.agentId}</span>
                  <span className="text-[var(--color-destructive)]">{h.count}회 · {h.totalTokens.toLocaleString()}tok</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="vulcan-card rounded-xl p-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-[var(--color-primary)]" />
        <span className="text-xs text-[var(--color-muted-foreground)]">{label}</span>
      </div>
      <p
        className="mt-2 text-2xl font-semibold"
        style={{ color: valueColor ?? "var(--color-foreground)" }}
      >
        {value}
      </p>
    </div>
  );
}
