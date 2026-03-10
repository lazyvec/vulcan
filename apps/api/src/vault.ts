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

export async function searchVaultNotes(query: string): Promise<VaultNoteSummary[]> {
  const vaultPath = getVaultPath();
  const files: string[] = [];
  await walk(vaultPath, files);

  const q = query.toLowerCase();
  const results: VaultNoteSummary[] = [];

  for (const f of files) {
    try {
      const raw = await readFile(f, "utf-8");
      const { data: frontmatter, content } = matter(raw);
      const rel = relative(vaultPath, f);
      const titleStr = (frontmatter.title as string) ?? basename(rel, ".md");

      const haystack = [
        rel,
        titleStr,
        content,
        JSON.stringify(frontmatter),
      ].join(" ").toLowerCase();

      if (haystack.includes(q)) {
        const info = await stat(f);
        results.push({
          path: rel,
          title: titleStr,
          frontmatter,
          modified: info.mtime.toISOString(),
        });
      }
    } catch {
      // 읽기 실패한 파일은 건너뜀
    }
  }
  return results;
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

export async function clipUrlToVault(url: string): Promise<ClipResult> {
  const vaultPath = getVaultPath();
  const { Defuddle } = await import("defuddle/node");
  const TurndownService = (await import("turndown")).default;

  const res = await fetch(url);
  const html = await res.text();

  const result = await Defuddle(html, url);
  const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
  const markdown = td.turndown(result.content ?? html);

  const title = result.title ?? new URL(url).hostname;
  const author = result.author ?? "";
  const published = result.published ?? "";
  const description = result.description ?? "";

  const slug = title
    .replace(/[^a-zA-Z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${dateStr}-${slug}.md`;
  const clippingsDir = join(vaultPath, "Clippings");

  await mkdir(clippingsDir, { recursive: true });

  const frontmatterObj = {
    title,
    author,
    published,
    description,
    source: url,
    clipped: dateStr,
  };
  const fileContent = matter.stringify(markdown, frontmatterObj);
  const filePath = join(clippingsDir, fileName);
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
