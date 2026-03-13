/**
 * Hermes Memory 자동 분류 (Phase 5.4)
 *
 * 1) 규칙 기반: 키워드 매칭으로 태그 + memoryType 자동 추론
 * 2) AI 트리거: Gateway RPC를 통해 Metis 에이전트에 분류 요청
 */

import type { HermesMemory, HermesMemoryType } from "@vulcan/shared/types";

// ── 규칙 기반 태그 사전 ────────────────────────────────────────────────────

interface TagRule {
  keywords: string[];
  tag: string;
}

const TAG_RULES: TagRule[] = [
  // 에이전트 조직
  { keywords: ["에이전트", "agent", "pantheon", "hermes"], tag: "agent" },
  { keywords: ["aegis", "보안", "security", "sre", "인프라"], tag: "security" },
  { keywords: ["metis", "리서치", "research", "정찰"], tag: "research" },
  { keywords: ["athena", "전략", "strategy", "재무", "포트폴리오"], tag: "strategy" },
  { keywords: ["themis", "product", "프로덕트", "prd"], tag: "product" },
  { keywords: ["iris", "디자인", "design", "ux", "ui"], tag: "design" },
  { keywords: ["daedalus", "코딩", "coding", "개발", "dev"], tag: "development" },
  { keywords: ["nike", "growth", "그로스", "gtm", "마케팅"], tag: "growth" },
  { keywords: ["calliope", "콘텐츠", "content", "브랜드", "brand"], tag: "content" },
  { keywords: ["argus", "평가", "evaluator", "qa"], tag: "evaluation" },

  // 기술 도메인
  { keywords: ["vulcan", "mission control", "대시보드", "dashboard"], tag: "vulcan" },
  { keywords: ["openclaw", "gateway", "게이트웨이"], tag: "openclaw" },
  { keywords: ["memory", "메모리", "fts", "인덱싱"], tag: "memory" },
  { keywords: ["workorder", "작업지시", "work order"], tag: "workorder" },
  { keywords: ["trace", "finops", "비용", "cost", "토큰"], tag: "finops" },
  { keywords: ["telegram", "텔레그램", "봇", "bot"], tag: "telegram" },

  // 프로젝트
  { keywords: ["fino", "tablinum", "재무"], tag: "fino" },
  { keywords: ["atrium", "아트리움"], tag: "atrium" },
  { keywords: ["caelo", "카엘로"], tag: "caelo" },
  { keywords: ["good2pick", "굿투픽"], tag: "good2pick" },
  { keywords: ["parcae", "파르카이"], tag: "parcae" },

  // 활동 유형
  { keywords: ["일지", "세션", "session", "일일"], tag: "daily" },
  { keywords: ["인사이트", "insight", "교훈", "lesson"], tag: "insight" },
  { keywords: ["마스터 플랜", "master plan", "로드맵", "roadmap"], tag: "plan" },
  { keywords: ["분석", "analysis", "검증", "validation"], tag: "analysis" },
];

// ── memoryType 추론 규칙 ────────────────────────────────────────────────────

const SKILL_KEYWORDS = [
  "전략", "strategy", "아키텍처", "architecture", "설계", "design",
  "플랜", "plan", "로드맵", "roadmap", "분석", "analysis",
  "패턴", "pattern", "방법론", "methodology", "프레임워크", "framework",
];

const FACT_KEYWORDS = [
  "일지", "daily", "세션", "session", "기록", "log",
  "현황", "status", "결과", "result", "데이터", "data",
];

/**
 * 규칙 기반 태그 자동 추론
 * 기존 태그에 추가 (중복 제거)
 */
export function inferTags(content: string, existingTags: string[]): string[] {
  const lower = content.toLowerCase();
  const newTags = new Set(existingTags);

  for (const rule of TAG_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      newTags.add(rule.tag);
    }
  }

  return Array.from(newTags).sort();
}

/**
 * 규칙 기반 memoryType 추론
 * content 내 키워드 빈도로 fact vs skill 판별
 */
export function inferMemoryType(content: string, currentType: HermesMemoryType): HermesMemoryType {
  const lower = content.toLowerCase();
  let skillScore = 0;
  let factScore = 0;

  for (const kw of SKILL_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) skillScore++;
  }
  for (const kw of FACT_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) factScore++;
  }

  // 명확한 차이가 있을 때만 변경
  if (skillScore > factScore + 2) return "skill";
  if (factScore > skillScore + 2) return "fact";
  return currentType;
}

/**
 * 단일 메모리의 태그 + 타입 자동 분류
 */
export function classifyMemory(memory: HermesMemory): {
  tags: string[];
  memoryType: HermesMemoryType;
  changed: boolean;
} {
  const fullText = `${memory.title}\n${memory.content}`;
  const newTags = inferTags(fullText, memory.tags);
  const newType = inferMemoryType(fullText, memory.memoryType);
  const changed =
    newType !== memory.memoryType ||
    JSON.stringify(newTags) !== JSON.stringify(memory.tags);

  return { tags: newTags, memoryType: newType, changed };
}

/**
 * 전체 메모리 일괄 분류
 * @returns 변경된 메모리 수
 */
export function classifyAll(
  memories: HermesMemory[],
  updateFn: (id: string, patch: { tags: string[]; memoryType: HermesMemoryType }) => unknown,
): { total: number; updated: number } {
  let updated = 0;
  for (const memory of memories) {
    const result = classifyMemory(memory);
    if (result.changed) {
      updateFn(memory.id, { tags: result.tags, memoryType: result.memoryType });
      updated++;
    }
  }
  return { total: memories.length, updated };
}

/**
 * AI 분류 요청 메시지 생성 (Gateway RPC chatSend용)
 */
export function buildClassifyPrompt(memory: HermesMemory): string {
  return [
    `다음 메모리 문서를 분석하고 JSON으로 응답해줘.`,
    ``,
    `## 문서 정보`,
    `- 제목: ${memory.title}`,
    `- 파일: ${memory.filePath}`,
    `- 현재 레이어: ${memory.layer}`,
    `- 현재 타입: ${memory.memoryType}`,
    `- 현재 태그: ${memory.tags.join(", ") || "없음"}`,
    ``,
    `## 내용 (앞부분)`,
    memory.content.slice(0, 2000),
    ``,
    `## 요청`,
    `1. memoryType: "fact" 또는 "skill" 중 적절한 것`,
    `2. tags: 최대 10개 영문 태그 배열`,
    `3. evergreen: true/false (시간이 지나도 가치가 유지되는 문서인지)`,
    ``,
    `JSON 형식으로만 응답:`,
    `{"memoryType": "...", "tags": [...], "evergreen": ...}`,
  ].join("\n");
}
