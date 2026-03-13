"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import type { CircuitBreakerConfig, DailyCostSummary } from "@vulcan/shared/types";
import { DollarSign, Cpu, AlertTriangle, Zap } from "lucide-react";

interface Props {
  summaries: DailyCostSummary[];
  cbConfigs: CircuitBreakerConfig[];
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

export function CostDashboard({ summaries, cbConfigs }: Props) {
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

  // 에이전트별 합계 (PieChart)
  const byAgent = useMemo(() => {
    const map = new Map<string, { tokens: number; cost: number; calls: number }>();
    for (const s of summaries) {
      const prev = map.get(s.agentId) ?? { tokens: 0, cost: 0, calls: 0 };
      map.set(s.agentId, {
        tokens: prev.tokens + s.totalInputTokens + s.totalOutputTokens,
        cost: prev.cost + s.totalCost,
        calls: prev.calls + s.callCount,
      });
    }
    return Array.from(map.entries())
      .map(([agentId, data]) => ({ agentId, ...data }))
      .sort((a, b) => b.cost - a.cost);
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

  // CB 상태
  const cbActiveCount = useMemo(
    () => cbConfigs.filter((c) => c.isActive).length,
    [cbConfigs],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <h2 className="section-title text-xl font-semibold">비용 대시보드</h2>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={DollarSign} label="총 비용 (7일)" value={`$${totalCost.toFixed(4)}`} />
        <MetricCard icon={Cpu} label="총 토큰" value={totalTokens.toLocaleString()} />
        <MetricCard icon={Zap} label="총 호출" value={totalCalls.toLocaleString()} />
        <MetricCard icon={AlertTriangle} label="CB 설정" value={`${cbActiveCount}개 활성`} />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
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
        </div>

        {/* 에이전트별 PieChart */}
        <div className="vulcan-card rounded-xl p-4">
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-foreground)]">에이전트별 비용</h3>
          {byAgent.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={280}>
                <PieChart>
                  <Pie
                    data={byAgent}
                    dataKey="cost"
                    nameKey="agentId"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {byAgent.map((entry) => (
                      <Cell key={entry.agentId} fill={getAgentColor(entry.agentId)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-background)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [`$${value.toFixed(4)}`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1">
                {byAgent.map((entry) => (
                  <div key={entry.agentId} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: getAgentColor(entry.agentId) }}
                    />
                    <span className="flex-1 text-[var(--color-foreground)]">{entry.agentId}</span>
                    <span className="text-[var(--color-muted-foreground)]">
                      ${entry.cost.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-[var(--color-muted-foreground)]">데이터 없음</p>
          )}
        </div>
      </div>

      {/* Circuit Breaker Table */}
      <div className="vulcan-card rounded-xl p-4">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-foreground)]">Circuit Breaker 설정</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                <th className="pb-2 font-medium">에이전트</th>
                <th className="pb-2 font-medium">일일 상한</th>
                <th className="pb-2 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {cbConfigs.map((c) => (
                <tr key={c.id} className="border-b border-[var(--color-border)]/50">
                  <td className="py-2 text-[var(--color-foreground)]">{c.agentId}</td>
                  <td className="py-2 text-[var(--color-muted-foreground)]">
                    {c.dailyTokenLimit.toLocaleString()} tok
                  </td>
                  <td className="py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.isActive
                          ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                          : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                      }`}
                    >
                      {c.isActive ? "활성" : "비활성"}
                    </span>
                  </td>
                </tr>
              ))}
              {cbConfigs.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-[var(--color-muted-foreground)]">
                    설정 없음
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="vulcan-card rounded-xl p-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-[var(--color-primary)]" />
        <span className="text-xs text-[var(--color-muted-foreground)]">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">{value}</p>
    </div>
  );
}
