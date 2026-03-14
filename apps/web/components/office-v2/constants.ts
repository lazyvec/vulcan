import type { AgentStatus } from "@/lib/types";
import type { FloorZoneConfig, SpriteConfig } from "./types";

// ── 6개 존 좌표 (% 기반, 16:9 비율 컨테이너) ────────────────────────────────

export const FLOOR_ZONES: FloorZoneConfig[] = [
  {
    id: "researching",
    label: "Library",
    icon: "📚",
    x: 2, y: 2, w: 35, h: 42,
    bg: "rgba(245, 158, 11, 0.06)",
    accent: "var(--color-warning)",
  },
  {
    id: "error",
    label: "Red Corner",
    icon: "🔴",
    x: 2, y: 52, w: 22, h: 46,
    bg: "rgba(239, 68, 68, 0.06)",
    accent: "var(--color-destructive)",
  },
  {
    id: "syncing",
    label: "Hallway",
    icon: "🚶",
    x: 40, y: 2, w: 22, h: 42,
    bg: "rgba(16, 185, 129, 0.06)",
    accent: "var(--color-success)",
  },
  {
    id: "idle",
    label: "Watercooler",
    icon: "☕",
    x: 27, y: 52, w: 26, h: 46,
    bg: "rgba(168, 162, 158, 0.04)",
    accent: "var(--color-muted-foreground)",
  },
  {
    id: "writing",
    label: "Desk",
    icon: "✍️",
    x: 56, y: 52, w: 42, h: 46,
    bg: "rgba(59, 130, 246, 0.06)",
    accent: "var(--color-info)",
  },
  {
    id: "executing",
    label: "Workbench",
    icon: "🔧",
    x: 65, y: 2, w: 33, h: 42,
    bg: "rgba(224, 122, 64, 0.06)",
    accent: "var(--color-primary)",
  },
];

export const FLOOR_ZONE_MAP: Record<AgentStatus, FloorZoneConfig> = Object.fromEntries(
  FLOOR_ZONES.map((z) => [z.id, z]),
) as Record<AgentStatus, FloorZoneConfig>;

// ── 판테온 에이전트 스프라이트 설정 ───────────────────────────────────────────

export const AGENT_SPRITES: Record<string, SpriteConfig> = {
  hermes: {
    agentId: "hermes",
    name: "Hermes",
    spritePath: "/sprites/agents/hermes.png",
    primaryColor: "#FFD700",
    secondaryColor: "#DAA520",
    roleTags: ["오케스트레이터"],
  },
  aegis: {
    agentId: "aegis",
    name: "Aegis",
    spritePath: "/sprites/agents/aegis.png",
    primaryColor: "#4A90D9",
    secondaryColor: "#2C5F8A",
    roleTags: ["보안"],
  },
  metis: {
    agentId: "metis",
    name: "Metis",
    spritePath: "/sprites/agents/metis.png",
    primaryColor: "#9B59B6",
    secondaryColor: "#6C3483",
    roleTags: ["리서치"],
  },
  athena: {
    agentId: "athena",
    name: "Athena",
    spritePath: "/sprites/agents/athena.png",
    primaryColor: "#BDC3C7",
    secondaryColor: "#95A5A6",
    roleTags: ["전략"],
  },
  themis: {
    agentId: "themis",
    name: "Themis",
    spritePath: "/sprites/agents/themis.png",
    primaryColor: "#ECF0F1",
    secondaryColor: "#D5DBDB",
    roleTags: ["프로덕트"],
  },
  iris: {
    agentId: "iris",
    name: "Iris",
    spritePath: "/sprites/agents/iris.png",
    primaryColor: "#E74C3C",
    secondaryColor: "#F39C12",
    roleTags: ["디자인"],
  },
  daedalus: {
    agentId: "daedalus",
    name: "Daedalus",
    spritePath: "/sprites/agents/daedalus.png",
    primaryColor: "#CD7F32",
    secondaryColor: "#8B4513",
    roleTags: ["개발"],
  },
  nike: {
    agentId: "nike",
    name: "Nike",
    spritePath: "/sprites/agents/nike.png",
    primaryColor: "#2ECC71",
    secondaryColor: "#27AE60",
    roleTags: ["그로스"],
  },
  calliope: {
    agentId: "calliope",
    name: "Calliope",
    spritePath: "/sprites/agents/calliope.png",
    primaryColor: "#FF69B4",
    secondaryColor: "#DB7093",
    roleTags: ["콘텐츠"],
  },
  argus: {
    agentId: "argus",
    name: "Argus",
    spritePath: "/sprites/agents/argus.png",
    primaryColor: "#C0C0C0",
    secondaryColor: "#808080",
    roleTags: ["평가"],
  },
};

// ── 존 내 에이전트 배치 계산 ─────────────────────────────────────────────────

/** 존 내 인덱스를 기반으로 격자 위치 계산 (겹침 방지) */
export function getAgentPositionInZone(
  index: number,
  total: number,
  zone: FloorZoneConfig,
): { left: number; top: number } {
  const cols = Math.ceil(Math.sqrt(Math.max(total, 1)));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const cellW = zone.w / (cols + 1);
  const cellH = zone.h / (Math.ceil(total / cols) + 1);
  return {
    left: zone.x + cellW * (col + 0.75),
    top: zone.y + cellH * (row + 0.75),
  };
}

// ── XP 레벨 공식 ─────────────────────────────────────────────────────────────

/** XP에서 레벨 계산 (100 XP 단위) */
export function xpToLevel(xp: number): { level: number; progress: number } {
  const level = Math.floor(xp / 100) + 1;
  const progress = (xp % 100) / 100;
  return { level, progress };
}
