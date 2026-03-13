/**
 * Hermes Memory 파일시스템 → DB 단방향 동기화
 *
 * 스캔 범위: HERMES_MEMORY_PATH 하위 resources/, items/, categories/
 * 변경 감지: SHA-256 content_hash 비교
 * SSOT: 파일시스템 (파일 삭제 시 DB에서도 제거)
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { MemorySyncResult, MemoryLayer, HermesMemoryType } from "@vulcan/shared/types";

const HERMES_MEMORY_PATH =
  process.env.HERMES_MEMORY_PATH ?? path.join(process.env.HOME ?? "/home/linuxuser", "hermes", "memory");

const SCAN_DIRS: { dir: string; layer: MemoryLayer }[] = [
  { dir: "resources", layer: "resource" },
  { dir: "items", layer: "item" },
  { dir: "categories", layer: "category" },
];

export interface ParsedMemoryFile {
  filePath: string;
  layer: MemoryLayer;
  memoryType: HermesMemoryType;
  title: string;
  content: string;
  contentHash: string;
  tags: string[];
  fileSize: number;
  fileModifiedAt: number;
}

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/** 첫 번째 `# heading`에서 제목 추출. 없으면 파일명 사용. */
function extractTitle(content: string, filePath: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  return path.basename(filePath, ".md");
}

/** 프론트매터 또는 내용에서 태그 추출 */
function extractTags(content: string): string[] {
  const tags: string[] = [];
  // YAML frontmatter tags: [a, b]
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const tagLine = fmMatch[1].match(/tags:\s*\[([^\]]*)\]/);
    if (tagLine) {
      tags.push(
        ...tagLine[1]
          .split(",")
          .map((t) => t.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean),
      );
    }
  }
  return tags;
}

/** layer별 기본 memoryType 추론 */
function inferMemoryType(layer: MemoryLayer): HermesMemoryType {
  // categories → skill (전략/분석 지식), resources/items → fact (사실 기반)
  return layer === "category" ? "skill" : "fact";
}

/** 지정된 디렉토리의 .md 파일을 재귀적으로 스캔 */
function scanMarkdownFiles(baseDir: string, subDir: string, layer: MemoryLayer): ParsedMemoryFile[] {
  const dirPath = path.join(baseDir, subDir);
  if (!fs.existsSync(dirPath)) return [];

  const results: ParsedMemoryFile[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isFile() && entry.name.endsWith(".md")) {
      try {
        const content = fs.readFileSync(fullPath, "utf8");
        const stat = fs.statSync(fullPath);
        const relativePath = path.relative(baseDir, fullPath);

        results.push({
          filePath: relativePath,
          layer,
          memoryType: inferMemoryType(layer),
          title: extractTitle(content, fullPath),
          content,
          contentHash: sha256(content),
          tags: extractTags(content),
          fileSize: stat.size,
          fileModifiedAt: Math.floor(stat.mtimeMs),
        });
      } catch {
        // 읽기 실패한 파일은 건너뜀
      }
    } else if (entry.isDirectory()) {
      // 1단계 하위 디렉토리까지만 스캔
      const subEntries = fs.readdirSync(fullPath, { withFileTypes: true });
      for (const sub of subEntries) {
        if (sub.isFile() && sub.name.endsWith(".md")) {
          try {
            const subFullPath = path.join(fullPath, sub.name);
            const content = fs.readFileSync(subFullPath, "utf8");
            const stat = fs.statSync(subFullPath);
            const relativePath = path.relative(baseDir, subFullPath);

            results.push({
              filePath: relativePath,
              layer,
              memoryType: inferMemoryType(layer),
              title: extractTitle(content, subFullPath),
              content,
              contentHash: sha256(content),
              tags: extractTags(content),
              fileSize: stat.size,
              fileModifiedAt: Math.floor(stat.mtimeMs),
            });
          } catch {
            // skip
          }
        }
      }
    }
  }

  return results;
}

/** 전체 메모리 디렉토리 스캔 */
export function scanAllMemoryFiles(): ParsedMemoryFile[] {
  if (!fs.existsSync(HERMES_MEMORY_PATH)) return [];

  const files: ParsedMemoryFile[] = [];
  for (const { dir, layer } of SCAN_DIRS) {
    files.push(...scanMarkdownFiles(HERMES_MEMORY_PATH, dir, layer));
  }
  return files;
}

/** DB 동기화 오케스트레이션 (store 함수를 주입받음) */
export function syncMemories(
  scanned: ParsedMemoryFile[],
  existing: Array<{ id: string; filePath: string; contentHash: string }>,
  upsertFn: (file: ParsedMemoryFile, existingId?: string) => void,
  removeFn: (id: string) => void,
): MemorySyncResult {
  const result: MemorySyncResult = { added: 0, updated: 0, removed: 0, unchanged: 0, errors: [] };

  const existingMap = new Map(existing.map((e) => [e.filePath, e]));
  const scannedPaths = new Set(scanned.map((f) => f.filePath));

  // upsert: 신규 또는 변경된 파일
  for (const file of scanned) {
    try {
      const ex = existingMap.get(file.filePath);
      if (!ex) {
        upsertFn(file);
        result.added++;
      } else if (ex.contentHash !== file.contentHash) {
        upsertFn(file, ex.id);
        result.updated++;
      } else {
        result.unchanged++;
      }
    } catch (err) {
      result.errors.push(`${file.filePath}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 삭제: DB에 있지만 파일이 없는 항목
  for (const ex of existing) {
    if (!scannedPaths.has(ex.filePath)) {
      try {
        removeFn(ex.id);
        result.removed++;
      } catch (err) {
        result.errors.push(`remove ${ex.filePath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return result;
}

// ── Auto-Flush: 파일 변경 감지 + 주기적 동기화 ──────────────────────────────

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5분 주기 폴백
const DEBOUNCE_MS = 2000; // 파일 변경 후 2초 대기

let autoSyncTimer: ReturnType<typeof setInterval> | null = null;
let watcherCleanups: Array<() => void> = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncCallback: (() => void) | null = null;

/**
 * Auto-Flush 시작: 파일 변경 감지 + 주기적 동기화
 * @param onSync - 동기화 실행 콜백 (store 함수 주입)
 */
export function startAutoFlush(onSync: () => void): void {
  syncCallback = onSync;

  // 1) 서버 시작 시 즉시 동기화
  try {
    onSync();
    console.log("[memory-sync] 초기 동기화 완료");
  } catch (err) {
    console.error("[memory-sync] 초기 동기화 실패:", err);
  }

  // 2) fs.watch로 디렉토리 감시 (recursive 지원하는 플랫폼에서 동작)
  for (const { dir } of SCAN_DIRS) {
    const dirPath = path.join(HERMES_MEMORY_PATH, dir);
    if (!fs.existsSync(dirPath)) continue;

    try {
      const watcher = fs.watch(dirPath, { recursive: true }, (_eventType, filename) => {
        if (!filename || !filename.endsWith(".md")) return;
        debouncedSync();
      });
      watcher.on("error", () => {
        // 감시 오류 시 무시 (폴링이 폴백)
      });
      watcherCleanups.push(() => watcher.close());
      console.log(`[memory-sync] 감시 시작: ${dirPath}`);
    } catch {
      console.log(`[memory-sync] fs.watch 불가: ${dirPath} (폴링 폴백)`);
    }
  }

  // 3) 주기적 동기화 (5분 간격 폴백)
  autoSyncTimer = setInterval(() => {
    try {
      onSync();
    } catch (err) {
      console.error("[memory-sync] 주기적 동기화 실패:", err);
    }
  }, AUTO_SYNC_INTERVAL_MS);

  console.log(`[memory-sync] Auto-Flush 활성화 (감시 ${watcherCleanups.length}개 디렉토리, ${AUTO_SYNC_INTERVAL_MS / 1000}초 폴링)`);
}

function debouncedSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (syncCallback) {
      try {
        syncCallback();
        console.log("[memory-sync] 파일 변경 감지 → 동기화 완료");
      } catch (err) {
        console.error("[memory-sync] 파일 변경 동기화 실패:", err);
      }
    }
  }, DEBOUNCE_MS);
}

/** Auto-Flush 종료 (graceful shutdown) */
export function stopAutoFlush(): void {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  for (const cleanup of watcherCleanups) {
    try { cleanup(); } catch { /* ignore */ }
  }
  watcherCleanups = [];
  syncCallback = null;
  console.log("[memory-sync] Auto-Flush 종료");
}

export { HERMES_MEMORY_PATH };
