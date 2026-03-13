/**
 * Hermes Memory 벡터 임베딩 + 시맨틱 검색 (Phase 5.6)
 *
 * - OpenAI text-embedding-3-small (1536 차원) 사용
 * - PG: pgvector 확장 + memories.embedding 컬럼
 * - SQLite: 순수 코사인 유사도 (메모리 내 계산, 소규모 전용)
 * - Hybrid search: FTS5 BM25 + vector cosine → RRF(Reciprocal Rank Fusion) 통합
 */

import type { HermesMemory, MemorySearchResult } from "@vulcan/shared/types";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIM = 1536;

// ── OpenAI 임베딩 생성 ─────────────────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) return null;

  // 텍스트 축약 (8192 토큰 제한, 대략 4문자/토큰)
  const truncated = text.slice(0, 30000);

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: truncated,
      }),
    });

    if (!res.ok) {
      console.error(`[embedding] OpenAI API 오류: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    return data.data[0]?.embedding ?? null;
  } catch (err) {
    console.error("[embedding] 임베딩 생성 실패:", err);
    return null;
  }
}

/**
 * 일괄 임베딩 생성 (OpenAI batch API)
 */
export async function generateEmbeddings(
  texts: string[],
): Promise<Array<number[] | null>> {
  if (!OPENAI_API_KEY || texts.length === 0) return texts.map(() => null);

  const truncated = texts.map((t) => t.slice(0, 30000));

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: truncated,
      }),
    });

    if (!res.ok) {
      console.error(`[embedding] Batch OpenAI API 오류: ${res.status}`);
      return texts.map(() => null);
    }

    const data = (await res.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };

    const result: Array<number[] | null> = texts.map(() => null);
    for (const item of data.data) {
      result[item.index] = item.embedding;
    }
    return result;
  } catch (err) {
    console.error("[embedding] 일괄 임베딩 생성 실패:", err);
    return texts.map(() => null);
  }
}

// ── 코사인 유사도 (SQLite 인메모리 폴백) ────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── SQLite 임베딩 저장소 (메모리 내) ────────────────────────────────────────

const embeddingCache = new Map<string, number[]>();

export function cacheEmbedding(memoryId: string, embedding: number[]): void {
  embeddingCache.set(memoryId, embedding);
}

export function getCachedEmbedding(memoryId: string): number[] | null {
  return embeddingCache.get(memoryId) ?? null;
}

export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

/**
 * 시맨틱 검색 (SQLite 모드: 인메모리 코사인 유사도)
 */
export function semanticSearch(
  queryEmbedding: number[],
  memories: HermesMemory[],
  limit: number = 20,
): Array<{ memory: HermesMemory; similarity: number }> {
  const scored: Array<{ memory: HermesMemory; similarity: number }> = [];

  for (const memory of memories) {
    const cached = getCachedEmbedding(memory.id);
    if (!cached) continue;
    const sim = cosineSimilarity(queryEmbedding, cached);
    scored.push({ memory, similarity: sim });
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit);
}

// ── Hybrid Search: FTS + Vector → RRF ──────────────────────────────────────

/**
 * Reciprocal Rank Fusion (RRF)
 * score = Σ 1 / (k + rank_i)
 * k=60 (표준 값)
 */
export function hybridSearchRRF(
  ftsResults: MemorySearchResult[],
  vectorResults: Array<{ memory: HermesMemory; similarity: number }>,
  limit: number = 20,
): MemorySearchResult[] {
  const k = 60;
  const scoreMap = new Map<string, { score: number; memory: HermesMemory; snippet: string }>();

  // FTS 랭킹
  for (let i = 0; i < ftsResults.length; i++) {
    const r = ftsResults[i];
    const existing = scoreMap.get(r.memory.id);
    const rrf = 1 / (k + i + 1);
    if (existing) {
      existing.score += rrf;
    } else {
      scoreMap.set(r.memory.id, {
        score: rrf,
        memory: r.memory,
        snippet: r.snippet,
      });
    }
  }

  // Vector 랭킹
  for (let i = 0; i < vectorResults.length; i++) {
    const r = vectorResults[i];
    const existing = scoreMap.get(r.memory.id);
    const rrf = 1 / (k + i + 1);
    if (existing) {
      existing.score += rrf;
    } else {
      scoreMap.set(r.memory.id, {
        score: rrf,
        memory: r.memory,
        snippet: r.memory.content.slice(0, 200),
      });
    }
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({
      memory: item.memory,
      rank: item.score,
      snippet: item.snippet,
    }));
}

// ── 유틸리티 ────────────────────────────────────────────────────────────────

export function isEmbeddingAvailable(): boolean {
  return !!OPENAI_API_KEY;
}

export function getEmbeddingDimensions(): number {
  return EMBEDDING_DIM;
}

export function getEmbeddingCacheSize(): number {
  return embeddingCache.size;
}

/**
 * 메모리 문서를 임베딩용 텍스트로 변환
 */
export function memoryToEmbeddingText(memory: HermesMemory): string {
  const parts = [
    `제목: ${memory.title}`,
    `레이어: ${memory.layer}`,
    `유형: ${memory.memoryType}`,
  ];
  if (memory.tags.length > 0) {
    parts.push(`태그: ${memory.tags.join(", ")}`);
  }
  parts.push("", memory.content);
  return parts.join("\n");
}
