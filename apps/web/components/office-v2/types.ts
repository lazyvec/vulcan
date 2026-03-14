import type { AgentStatus } from "@/lib/types";

// ── 바닥맵 존 설정 ──────────────────────────────────────────────────────────

export interface FloorZoneConfig {
  id: AgentStatus;
  label: string;
  icon: string;
  /** % 기반 좌표 (0~100) */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 배경색 (반투명) */
  bg: string;
  /** 테두리 강조색 */
  accent: string;
}

// ── 스프라이트 설정 ──────────────────────────────────────────────────────────

export interface SpriteConfig {
  agentId: string;
  name: string;
  /** PNG 경로 (null이면 SVG 아바타 사용) */
  spritePath: string | null;
  /** 픽셀아트 팔레트 시드 색상 */
  primaryColor: string;
  secondaryColor: string;
  /** 에이전트 역할 태그 */
  roleTags: string[];
}

// ── 에이전트 위치 ──────────────────────────────────────────────────────────

export interface AgentPosition {
  agentId: string;
  /** 바닥맵 기준 % 좌표 */
  left: number;
  top: number;
  zone: AgentStatus;
}

// ── XP 시스템 ──────────────────────────────────────────────────────────────

export interface AgentXP {
  agentId: string;
  name: string;
  xp: number;
  level: number;
  /** 현재 레벨 내 진행률 0~1 */
  progress: number;
  completedOrders: number;
  eventCount: number;
  tokenUsage: number;
}

// ── 히트맵 셀 ──────────────────────────────────────────────────────────────

export interface HeatmapCell {
  day: number; // 0=오늘, 6=6일전
  hour: number; // 0~23
  count: number;
}
