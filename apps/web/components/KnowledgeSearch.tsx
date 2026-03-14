"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  HermesMemory,
  MemorySearchResult,
  MemoryStats,
  MemoryLayer,
  HermesMemoryType,
  MemorySyncResult,
  MemoryDecayResult,
} from "@/lib/types";
import {
  Search,
  RefreshCw,
  Timer,
  Database,
  FileText,
  FolderOpen,
  Layers,
  Tag,
  Eye,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Tags,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

const API_BASE = "";

interface KnowledgeSearchProps {
  initialStats: MemoryStats;
}

const LAYER_LABELS: Record<MemoryLayer, string> = {
  resource: "리소스",
  item: "아이템",
  category: "카테고리",
};

const TYPE_LABELS: Record<HermesMemoryType, string> = {
  fact: "사실",
  skill: "스킬",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MemoryCard({
  result,
  onExpand,
}: {
  result: MemorySearchResult;
  onExpand: (m: HermesMemory) => void;
}) {
  const { memory, snippet } = result;
  return (
    <div
      className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition-colors hover:border-[var(--color-primary)]/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]">
              <Layers size={10} />
              {LAYER_LABELS[memory.layer]}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]">
              <Database size={10} />
              {TYPE_LABELS[memory.memoryType]}
            </span>
            {memory.evergreen && (
              <span className="rounded-full bg-[var(--color-success)]/20 px-2 py-0.5 text-[10px] font-medium text-[var(--color-success)]">
                상시
              </span>
            )}
          </div>
          <h3 className="mt-1 text-sm font-semibold text-[var(--color-foreground)] line-clamp-1">
            {memory.title}
          </h3>
          <p
            className="mt-1 text-xs text-[var(--color-muted-foreground)] line-clamp-2"
            dangerouslySetInnerHTML={{ __html: snippet }}
          />
        </div>
        <button
          type="button"
          onClick={() => onExpand(memory)}
          className="shrink-0 rounded p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--color-tertiary)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          title="상세 보기"
        >
          <Eye size={16} />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--color-tertiary)]">
        <span className="flex items-center gap-1">
          <FileText size={10} />
          {memory.filePath}
        </span>
        <span>{formatBytes(memory.fileSize)}</span>
        <span>{formatDate(memory.updatedAt)}</span>
        {memory.tags.length > 0 && (
          <span className="flex items-center gap-1">
            <Tag size={10} />
            {memory.tags.slice(0, 3).join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}

function StatsBar({ stats }: { stats: MemoryStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: "전체 문서", value: stats.total, icon: Database },
        { label: "리소스", value: stats.byLayer.resource ?? 0, icon: FolderOpen },
        { label: "아이템", value: stats.byLayer.item ?? 0, icon: FileText },
        { label: "카테고리", value: stats.byLayer.category ?? 0, icon: Layers },
      ].map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3"
        >
          <item.icon size={18} className="text-[var(--color-primary)]" />
          <div>
            <p className="text-lg font-semibold text-[var(--color-foreground)]">{item.value}</p>
            <p className="text-[10px] text-[var(--color-muted-foreground)]">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailPanel({
  memory,
  onClose,
}: {
  memory: HermesMemory;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const content = memory.content;
  const isLong = content.length > 800;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{memory.title}</h2>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{memory.filePath}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[var(--color-tertiary)] hover:bg-[var(--color-muted)]"
        >
          &times;
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
          {LAYER_LABELS[memory.layer]}
        </span>
        <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
          {TYPE_LABELS[memory.memoryType]}
        </span>
        <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
          점수: {memory.utilityScore.toFixed(2)}
        </span>
        <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
          조회: {memory.accessCount}회
        </span>
        {memory.evergreen && (
          <span className="rounded-full bg-[var(--color-success)]/20 px-2 py-0.5 text-xs text-[var(--color-success)]">
            상시
          </span>
        )}
      </div>
      {memory.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {memory.tags.map((t) => (
            <span key={t} className="rounded bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-[10px] text-[var(--color-primary)]">
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 rounded border border-[var(--color-border)] bg-[var(--color-background)] p-3">
        <pre className="whitespace-pre-wrap text-xs text-[var(--color-foreground)]">
          {isLong && !expanded ? content.slice(0, 800) + "…" : content}
        </pre>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? "접기" : "더 보기"}
          </button>
        )}
      </div>
    </div>
  );
}

export function KnowledgeSearch({ initialStats }: KnowledgeSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemorySearchResult[]>([]);
  const [stats, setStats] = useState<MemoryStats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<HermesMemory | null>(null);
  const [layerFilter, setLayerFilter] = useState<MemoryLayer | "">("");
  const [typeFilter, setTypeFilter] = useState<HermesMemoryType | "">("");
  const [semanticMode, setSemanticMode] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const doSearch = useCallback(
    async (q: string, layer: string, type: string, semantic: boolean) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (layer) params.set("layer", layer);
        if (type) params.set("type", type);

        const endpoint = semantic && q
          ? `${API_BASE}/api/memories/semantic`
          : `${API_BASE}/api/memories/search`;
        const suffix = params.toString();
        const url = suffix ? `${endpoint}?${suffix}` : endpoint;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        toast("error", "검색 실패");
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  // 초기 로드: 전체 목록
  useEffect(() => {
    void doSearch("", "", "", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce 검색
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void doSearch(query, layerFilter, typeFilter, semanticMode);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, layerFilter, typeFilter, semanticMode, doSearch]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/api/memories/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { ok: boolean; result: MemorySyncResult };
      toast(
        "success",
        `동기화 완료: +${data.result.added} 추가, ~${data.result.updated} 수정, -${data.result.removed} 삭제`,
      );
      // 통계 + 결과 새로고침
      const statsRes = await fetch(`${API_BASE}/api/memories/stats`);
      const statsData = await statsRes.json();
      setStats(statsData.stats);
      void doSearch(query, layerFilter, typeFilter, semanticMode);
    } catch {
      toast("error", "동기화 실패");
    } finally {
      setSyncing(false);
    }
  };

  const handleDecay = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/memories/decay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ halfLifeDays: 30 }),
      });
      const data = (await res.json()) as { ok: boolean; result: MemoryDecayResult };
      toast(
        "success",
        `Decay 완료: ${data.result.processed}건 처리, ${data.result.expired}건 만료`,
      );
    } catch {
      toast("error", "Decay 실패");
    }
  };

  const handleClassifyAll = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/memories/classify-all`, {
        method: "POST",
      });
      const data = (await res.json()) as { ok: boolean; total: number; updated: number };
      toast("success", `분류 완료: ${data.total}건 중 ${data.updated}건 업데이트`);
      void doSearch(query, layerFilter, typeFilter, semanticMode);
    } catch {
      toast("error", "분류 실패");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">지식 검색</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Hermes 메모리 파일 인덱스 ({formatBytes(stats.totalFileSize)})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClassifyAll}
            title="규칙 기반 자동 분류"
          >
            <Tags size={14} />
            분류
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDecay}
            title="Temporal Decay 실행"
          >
            <Timer size={14} />
            Decay
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "동기화 중…" : "동기화"}
          </Button>
        </div>
      </div>

      {/* 통계 */}
      <StatsBar stats={stats} />

      {/* 검색 바 + 필터 */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-tertiary)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={semanticMode ? "시맨틱 검색…" : "키워드로 지식 검색…"}
            className="w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-background)] py-2 pl-9 pr-3 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-tertiary)] focus:border-[var(--color-primary)] focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setSemanticMode(!semanticMode)}
          title={semanticMode ? "키워드 검색으로 전환" : "시맨틱 검색으로 전환"}
          className={`flex items-center gap-1.5 rounded-[var(--radius-control)] border px-3 py-2 text-sm transition-colors ${
            semanticMode
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
              : "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted-foreground)]"
          }`}
        >
          <Sparkles size={14} />
          {semanticMode ? "시맨틱" : "키워드"}
        </button>
        <select
          value={layerFilter}
          onChange={(e) => setLayerFilter(e.target.value as MemoryLayer | "")}
          className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
        >
          <option value="">전체 레이어</option>
          <option value="resource">리소스</option>
          <option value="item">아이템</option>
          <option value="category">카테고리</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as HermesMemoryType | "")}
          className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
        >
          <option value="">전체 유형</option>
          <option value="fact">사실</option>
          <option value="skill">스킬</option>
        </select>
      </div>

      {/* 상세 패널 */}
      {selectedMemory && (
        <DetailPanel memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
      )}

      {/* 결과 */}
      {loading ? (
        <div className="py-12 text-center text-sm text-[var(--color-muted-foreground)]">
          검색 중…
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Search size={40} />}
          message="검색 결과 없음 — 다른 키워드로 검색하거나 동기화 버튼을 눌러 최신 데이터를 가져오세요."
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {results.length}건 표시
          </p>
          {results.map((r) => (
            <MemoryCard key={r.memory.id} result={r} onExpand={setSelectedMemory} />
          ))}
        </div>
      )}
    </div>
  );
}
