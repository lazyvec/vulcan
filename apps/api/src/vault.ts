/**
 * Obsidian Vault 읽기/검색/클리핑 모듈
 * obsidian-skills를 TypeScript로 포팅 + path traversal 방어
 */

import { readFile, writeFile, readdir, stat, mkdir, unlink, access, rename } from "node:fs/promises";
import { join, relative, extname, basename, resolve, dirname } from "node:path";
/* MIME 타입 매핑 (보안: 허용된 확장자만 서빙) */
const ALLOWED_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
};
import matter from "gray-matter";
import type { VaultNote, VaultNoteSummary, ClipResult } from "@vulcan/shared/types";

function getVaultPath(): string {
  const p = process.env.OBSIDIAN_VAULT_PATH;
  if (!p) throw new Error("OBSIDIAN_VAULT_PATH not configured");
  return resolve(p);
}

function assertInsideVault(abs: string, vaultPath: string): void {
  const resolved = resolve(abs);
  if (!resolved.startsWith(vaultPath + "/") && resolved !== vaultPath) {
    throw new Error("path traversal blocked");
  }
}

async function walk(dir: string, result: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full, result);
    } else if (extname(e.name) === ".md") {
      result.push(full);
    }
  }
}

export async function listVaultNotes(): Promise<VaultNoteSummary[]> {
  const vaultPath = getVaultPath();
  const files: string[] = [];
  await walk(vaultPath, files);

  const notes: VaultNoteSummary[] = [];
  for (const f of files) {
    try {
      const raw = await readFile(f, "utf-8");
      const { data: frontmatter } = matter(raw);
      const info = await stat(f);
      const rel = relative(vaultPath, f);
      notes.push({
        path: rel,
        title: (frontmatter.title as string) ?? basename(rel, ".md"),
        frontmatter,
        modified: info.mtime.toISOString(),
      });
    } catch {
      // 읽기 실패한 파일은 건너뜀
    }
  }
  return notes;
}

export async function readVaultNote(relPath: string): Promise<VaultNote> {
  const vaultPath = getVaultPath();
  const abs = resolve(join(vaultPath, relPath));
  assertInsideVault(abs, vaultPath);

  const raw = await readFile(abs, "utf-8");
  const { data: frontmatter, content } = matter(raw);
  const info = await stat(abs);
  return {
    path: relative(vaultPath, abs),
    title: (frontmatter.title as string) ?? basename(relPath, ".md"),
    frontmatter,
    content: content.trim(),
    modified: info.mtime.toISOString(),
  };
}


export async function writeVaultNote(
  relPath: string,
  content: string,
  frontmatter?: Record<string, unknown>,
): Promise<VaultNote> {
  const vaultPath = getVaultPath();
  const abs = resolve(join(vaultPath, relPath));
  assertInsideVault(abs, vaultPath);

  // 기존 파일이 존재하는지 확인
  await stat(abs); // ENOENT → 404

  // frontmatter가 명시되지 않으면 기존 것 유지
  let fm = frontmatter;
  if (!fm) {
    const raw = await readFile(abs, "utf-8");
    fm = matter(raw).data;
  }

  const fileContent = matter.stringify(content, fm ?? {});
  await writeFile(abs, fileContent, "utf-8");

  const info = await stat(abs);
  return {
    path: relative(vaultPath, abs),
    title: (fm?.title as string) ?? basename(relPath, ".md"),
    frontmatter: fm ?? {},
    content: content.trim(),
    modified: info.mtime.toISOString(),
  };
}

export async function createVaultNote(
  relPath: string,
  content: string,
  frontmatter?: Record<string, unknown>,
): Promise<VaultNote> {
  const vaultPath = getVaultPath();
  const abs = resolve(join(vaultPath, relPath));
  assertInsideVault(abs, vaultPath);

  // 이미 존재하면 에러
  try {
    await access(abs);
    throw new Error("already exists");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  // 중간 디렉토리 자동 생성
  await mkdir(dirname(abs), { recursive: true });

  const fm = frontmatter ?? {};
  if (!fm.title) fm.title = basename(relPath, ".md");
  const fileContent = matter.stringify(content, fm);
  await writeFile(abs, fileContent, "utf-8");

  const info = await stat(abs);
  return {
    path: relative(vaultPath, abs),
    title: (fm.title as string) ?? basename(relPath, ".md"),
    frontmatter: fm,
    content: content.trim(),
    modified: info.mtime.toISOString(),
  };
}

export async function deleteVaultNote(relPath: string): Promise<void> {
  const vaultPath = getVaultPath();
  const abs = resolve(join(vaultPath, relPath));
  assertInsideVault(abs, vaultPath);
  await unlink(abs); // ENOENT → 404
}

export async function renameVaultNote(
  oldRelPath: string,
  newRelPath: string,
): Promise<VaultNote> {
  const vaultPath = getVaultPath();
  const oldAbs = resolve(join(vaultPath, oldRelPath));
  const newAbs = resolve(join(vaultPath, newRelPath));
  assertInsideVault(oldAbs, vaultPath);
  assertInsideVault(newAbs, vaultPath);

  // 원본 존재 확인
  await stat(oldAbs); // ENOENT → 404

  // 대상이 이미 존재하면 에러
  try {
    await access(newAbs);
    throw new Error("already exists");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  // 대상 디렉토리 생성
  await mkdir(dirname(newAbs), { recursive: true });
  await rename(oldAbs, newAbs);

  // 변경된 노트 반환
  return readVaultNote(newRelPath);
}

export async function uploadToVault(
  fileName: string,
  data: Buffer,
): Promise<{ fileName: string; relativePath: string }> {
  const vaultPath = getVaultPath();
  const attachmentsDir = join(vaultPath, "attachments");
  await mkdir(attachmentsDir, { recursive: true });

  // 파일명 충돌 방지
  const ext = extname(fileName);
  const base = basename(fileName, ext);
  const safeName = base.replace(/[^a-zA-Z0-9가-힣_-]/g, "_");
  const timestamp = Date.now();
  const finalName = `${safeName}-${timestamp}${ext}`;
  const filePath = join(attachmentsDir, finalName);

  assertInsideVault(filePath, vaultPath);
  await writeFile(filePath, data);

  return {
    fileName: finalName,
    relativePath: `attachments/${finalName}`,
  };
}

/** vault 파일을 바이너리로 읽어서 반환 (첨부파일 서빙용) */
export async function readVaultFile(relPath: string): Promise<{ data: Buffer; mimeType: string }> {
  const vaultPath = getVaultPath();
  const abs = resolve(join(vaultPath, relPath));
  assertInsideVault(abs, vaultPath);

  const ext = extname(abs).toLowerCase();
  const mimeType = ALLOWED_MIME[ext];
  if (!mimeType) throw new Error("unsupported file type");

  const data = await readFile(abs);
  return { data, mimeType };
}

/** 검색 결과에 snippet(문맥 미리보기) 포함 */
export async function searchVaultNotesWithSnippet(
  query: string,
): Promise<(VaultNoteSummary & { snippet?: string })[]> {
  const vaultPath = getVaultPath();
  const files: string[] = [];
  await walk(vaultPath, files);

  const q = query.toLowerCase();
  const results: (VaultNoteSummary & { snippet?: string })[] = [];

  for (const f of files) {
    try {
      const raw = await readFile(f, "utf-8");
      const { data: frontmatter, content } = matter(raw);
      const rel = relative(vaultPath, f);
      const titleStr = (frontmatter.title as string) ?? basename(rel, ".md");

      const haystack = [rel, titleStr, content, JSON.stringify(frontmatter)]
        .join(" ")
        .toLowerCase();

      if (haystack.includes(q)) {
        const info = await stat(f);
        // snippet: 매칭 위치 전후 ~60자
        let snippet: string | undefined;
        const contentLower = content.toLowerCase();
        const idx = contentLower.indexOf(q);
        if (idx !== -1) {
          const start = Math.max(0, idx - 60);
          const end = Math.min(content.length, idx + q.length + 60);
          snippet =
            (start > 0 ? "..." : "") +
            content.slice(start, end).replace(/\n/g, " ") +
            (end < content.length ? "..." : "");
        }

        results.push({
          path: rel,
          title: titleStr,
          frontmatter,
          modified: info.mtime.toISOString(),
          snippet,
        });
      }
    } catch {
      // 읽기 실패한 파일은 건너뜀
    }
  }
  return results;
}

/** URL 도메인/키워드 기반 카테고리 자동 분류 */
function classifyCategory(url: string, title: string, description: string): string {
  const haystack = `${url} ${title} ${description}`.toLowerCase();

  const rules: [string, RegExp][] = [
    ["AI", /\b(ai|llm|gpt|claude|openai|anthropic|machine.?learn|neural|transformer|agent|rag)\b/],
    ["Tech", /\b(github|programming|developer|api|framework|docker|kubernetes|database|linux|typescript|python|rust)\b/],
    ["Crypto", /\b(crypto|bitcoin|ethereum|blockchain|web3|defi|nft|token)\b/],
    ["Startup", /\b(startup|yc|venture|fundrais|founder|pivot|mvp|saas|indie.?hack)\b/],
    ["Biz", /\b(business|revenue|profit|market|strategy|growth|monetiz|pricing|수익|매출|사업)\b/],
    ["Life", /\b(life|productiv|habit|health|mindset|book|review|travel|삶|습관|독서)\b/],
  ];

  for (const [category, pattern] of rules) {
    if (pattern.test(haystack)) return category;
  }
  return "Uncategorized";
}

/** 파일명 안전 문자열 생성 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9가-힣\s_-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)));
}

function cleanTitleCandidate(value: string | null | undefined): string {
  return decodeHtmlEntities(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitleFromHtml(html: string): string {
  const patterns = [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["'][^>]*>/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const candidate = cleanTitleCandidate(match?.[1]);
    if (candidate) return candidate;
  }
  return "";
}

function pickClipTitle(url: string, html: string, extractedTitle: string | null | undefined): string {
  const candidates = [
    cleanTitleCandidate(extractedTitle),
    extractTitleFromHtml(html),
    cleanTitleCandidate(new URL(url).hostname.replace(/^www\./, "")),
  ];

  for (const candidate of candidates) {
    if (candidate && !/^untitled clipping\b/i.test(candidate) && !/^untitled\b/i.test(candidate)) {
      return candidate;
    }
  }

  return "Untitled Clipping";
}

export async function clipUrlToVault(url: string): Promise<ClipResult> {
  const vaultPath = getVaultPath();
  const { Defuddle } = await import("defuddle/node");
  const TurndownService = (await import("turndown")).default;

  const res = await fetch(url);
  const html = await res.text();

  const result = await Defuddle(html, url);
  const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
  const markdown = td.turndown(result.content ?? html);

  const title = pickClipTitle(url, html, result.title);
  const author = result.author ?? "";
  const published = result.published ?? "";
  const description = result.description ?? "";
  const dateStr = new Date().toISOString().slice(0, 10);

  // 카테고리 자동 분류
  const category = classifyCategory(url, title, description);

  // 제목 기반 파일명 (날짜 접두어 없음 — Steph Ango 방식)
  const safeName = sanitizeFileName(title) || "Untitled Clipping";
  let fileName = `${safeName}.md`;
  const clippingsDir = join(vaultPath, "Clippings", category);
  await mkdir(clippingsDir, { recursive: true });

  // 중복 파일명 처리
  let filePath = join(clippingsDir, fileName);
  try {
    await access(filePath);
    fileName = `${safeName} (${dateStr}).md`;
    filePath = join(clippingsDir, fileName);
  } catch {
    // 파일 없음 — 정상
  }

  const frontmatterObj = {
    title,
    author,
    published,
    description,
    source: url,
    category,
    tags: ["clipping", "web"],
    clipped: dateStr,
  };
  const fileContent = matter.stringify(markdown, frontmatterObj);
  await writeFile(filePath, fileContent, "utf-8");

  return {
    title,
    author,
    published,
    description,
    url,
    savedPath: relative(vaultPath, filePath),
  };
}
