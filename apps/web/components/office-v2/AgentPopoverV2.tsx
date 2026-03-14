"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { Agent, WorkOrder } from "@/lib/types";
import { STATUS_LABELS, OFFICE_ZONES } from "@/lib/statusMap";
import { getSpriteConfig } from "./sprite-map";
import { PixelAvatar } from "./PixelAvatar";

interface AgentPopoverV2Props {
  agent: Agent;
  workOrder: WorkOrder | null;
  tokenUsage: number;
  onClose: () => void;
  /** 팝오버 위치: 에이전트 기준 위/아래 */
  placement?: "above" | "below";
  /** 에이전트의 수평 위치 (0-100%), 좌우 경계 보정에 사용 */
  horizontalPct?: number;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0초";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  return `${h}시간 ${m % 60}분`;
}

/** 10초마다 갱신되는 현재 시각 외부 스토어 (lazy 초기화) */
let currentTs = 0;
let intervalId: ReturnType<typeof setInterval> | undefined;
const tsListeners = new Set<() => void>();

function ensureTimer() {
  if (typeof window === "undefined" || intervalId != null) return;
  currentTs = Date.now();
  intervalId = setInterval(() => {
    currentTs = Date.now();
    tsListeners.forEach((l) => l());
  }, 10_000);
}

function subscribeTs(cb: () => void) {
  ensureTimer();
  tsListeners.add(cb);
  return () => { tsListeners.delete(cb); };
}
function getTsSnapshot() { ensureTimer(); return currentTs; }
function getServerTsSnapshot() { return 0; }

/** placement + horizontalPct → CSS 클래스 결정 */
function getPositionClasses(placement: "above" | "below", hPct: number) {
  const vertical = placement === "above"
    ? "bottom-full mb-2"
    : "top-full mt-2";

  // 좌우 경계 보정: 20% 미만 → 왼쪽 정렬, 80% 초과 → 오른쪽 정렬
  let horizontal = "left-1/2 -translate-x-1/2";
  if (hPct < 20) horizontal = "left-0";
  else if (hPct > 80) horizontal = "right-0";

  return `${vertical} ${horizontal}`;
}

export function AgentPopoverV2({
  agent,
  workOrder,
  tokenUsage,
  onClose,
  placement = "below",
  horizontalPct = 50,
}: AgentPopoverV2Props) {
  const sprite = getSpriteConfig(agent);
  const now = useSyncExternalStore(subscribeTs, getTsSnapshot, getServerTsSnapshot);
  const stayDuration = Math.max(0, now - agent.statusSince);
  const popoverRef = useRef<HTMLDivElement>(null);

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // 열릴 때 닫기 버튼으로 포커스 이동
  useEffect(() => {
    const closeBtn = popoverRef.current?.querySelector<HTMLButtonElement>("[data-close]");
    closeBtn?.focus();
  }, []);

  return (
    <motion.div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${agent.name} 상세 정보`}
      initial={{ opacity: 0, scale: 0.9, y: placement === "above" ? -10 : 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: placement === "above" ? -10 : 10 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`absolute z-30 w-64 rounded-xl border border-glass-border bg-[var(--color-surface)] p-4 shadow-2xl backdrop-blur-xl ${getPositionClasses(placement, horizontalPct)}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <PixelAvatar
            name={sprite.name}
            primaryColor={sprite.primaryColor}
            secondaryColor={sprite.secondaryColor}
            size={28}
          />
          <div>
            <p className="text-sm font-bold tracking-tight text-[var(--color-foreground)]">
              {agent.name}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-muted-foreground)]">
              {STATUS_LABELS[agent.status]} · {OFFICE_ZONES[agent.status]}
            </p>
          </div>
        </div>
        <button
          data-close
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-tertiary)] hover:bg-[var(--color-muted)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* 역할 태그 */}
      {sprite.roleTags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {sprite.roleTags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-[var(--color-primary-bg)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 상세 정보 */}
      <div className="space-y-2">
        {/* 체류 시간 + 토큰 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-[var(--color-background)]/40 p-2 shadow-inner border border-glass-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
              체류 시간
            </p>
            <p className="mt-0.5 text-sm font-black text-[var(--color-foreground)]">
              {formatDuration(stayDuration)}
            </p>
          </div>
          <div className="rounded-lg bg-[var(--color-background)]/40 p-2 shadow-inner border border-glass-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
              Daily Tokens
            </p>
            <p className="mt-0.5 text-sm font-black text-[var(--color-foreground)]">
              {tokenUsage > 0 ? tokenUsage.toLocaleString() : "0"}
            </p>
          </div>
        </div>

        {/* 현재 임무 */}
        <div className="rounded-lg bg-[var(--color-background)]/40 p-2 shadow-inner border border-glass-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
            Current Mission
          </p>
          {workOrder ? (
            <div className="mt-1">
              <p className="text-[11px] font-semibold leading-relaxed text-[var(--color-foreground)] line-clamp-2">
                {workOrder.summary}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter ${
                    workOrder.status === "in_progress"
                      ? "bg-[var(--color-primary-bg)] text-[var(--color-primary)]"
                      : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {workOrder.status}
                </span>
                <span className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                  {workOrder.type}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-[11px] font-medium text-[var(--color-muted-foreground)] italic">
              지정된 임무가 없습니다.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
