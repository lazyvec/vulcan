"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface MemoryEntry {
  id: string;
  content: string;
  category: string;
  createdAt: number;
}

/** 초 단위 vs 밀리초 단위 자동 판별 */
function toMs(ts: number): number {
  if (ts === 0) return Date.now();
  return ts < 1e12 ? ts * 1000 : ts;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 0) return "방금";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

export function MemoryTimeline() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/memories?limit=5&sort=recent", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data?.memories) {
          setMemories(
            data.memories.slice(0, 5).map((m: Record<string, unknown>) => ({
              id: m.id as string,
              content: (m.content as string) ?? (m.summary as string) ?? "",
              category: (m.category as string) ?? (m.type as string) ?? "general",
              createdAt: toMs((m.createdAt as number) ?? 0),
            })),
          );
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  return (
    <div className="rounded-xl border border-glass-border bg-[var(--color-surface)] p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          Memory Timeline
        </span>
        <Link
          href="/memory?tab=knowledge"
          className="text-[10px] font-bold text-[var(--color-primary)] hover:underline"
        >
          전체보기
        </Link>
      </div>

      <div className="mt-2 space-y-0.5">
        {memories.length > 0 ? (
          memories.map((m) => (
            <div
              key={m.id}
              className="flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-[var(--color-background)]/40 transition-colors"
            >
              {/* 타임라인 점 */}
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)] opacity-50" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-[11px] font-medium text-[var(--color-foreground)]">
                  {m.content}
                </p>
                <p className="text-[9px] text-[var(--color-muted-foreground)] opacity-80">
                  {m.category} · {formatRelativeTime(m.createdAt)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="py-3 text-center text-[11px] text-[var(--color-muted-foreground)]">
            메모리 없음
          </p>
        )}
      </div>
    </div>
  );
}
