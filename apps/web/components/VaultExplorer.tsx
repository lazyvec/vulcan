"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle,
  ChevronLeft,
  Edit3,
  Eye,
  FileEdit,
  FileText,
  FilePlus,
  FolderClosed,
  FolderOpen,
  Link,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import type { VaultNoteSummary, VaultNote } from "@vulcan/shared/types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { MarkdownEditor } from "./MarkdownEditor";

/* ── 유틸 ──────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  note?: VaultNoteSummary;
}

function buildTree(notes: VaultNoteSummary[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const note of notes) {
    const parts = note.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");

      let existing = current.find((n) => n.name === part);
      if (!existing) {
        existing = {
          name: part,
          path: fullPath,
          children: [],
          note: isFile ? note : undefined,
        };
        current.push(existing);
      }
      if (isFile) {
        existing.note = note;
      }
      current = existing.children;
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      const aIsFolder = a.children.length > 0 && !a.note;
      const bIsFolder = b.children.length > 0 && !b.note;
      if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) sortNodes(n.children);
  };
  sortNodes(root);
  return root;
}

/** 매칭 키워드를 <mark>로 감싸는 유틸 */
function highlightSnippet(snippet: string, query: string): string {
  if (!query) return snippet;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return snippet.replace(
    new RegExp(`(${escaped})`, "gi"),
    "<mark>$1</mark>",
  );
}

/* ── Toast ─────────────────────────────────────────── */

interface ToastMessage {
  id: number;
  type: "success" | "error";
  text: string;
}

function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);

  const show = useCallback((type: "success" | "error", text: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return { toasts, show };
}

function ToastContainer({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 rounded-[var(--radius-card)] px-4 py-3 text-sm shadow-lg animate-in slide-in-from-right fade-in duration-200 ${
            t.type === "success"
              ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border border-[var(--color-success-border)]"
              : "bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)] border border-[var(--color-destructive-border)]"
          }`}
        >
          {t.type === "success" ? (
            <CheckCircle size={16} className="shrink-0" />
          ) : (
            <XCircle size={16} className="shrink-0" />
          )}
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ── 새 노트 생성 모달 ────────────────────────────── */

function NewNoteModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (path: string) => void;
}) {
  const [path, setPath] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    let p = path.trim();
    if (!p) return;
    if (!p.endsWith(".md")) p += ".md";
    onCreate(p);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="vulcan-card w-full max-w-md p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
          새 노트 생성
        </h3>
        <input
          ref={inputRef}
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="경로 (예: Oracle/새노트.md)"
          className="vulcan-input mb-4 w-full"
        />
        <p className="mb-4 text-xs text-[var(--color-tertiary)]">
          폴더를 포함한 경로를 입력하세요. 폴더가 없으면 자동 생성됩니다.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="vulcan-button-ghost">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!path.trim()}
            className="vulcan-button disabled:opacity-50"
          >
            생성
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 삭제 확인 모달 ───────────────────────────────── */

function DeleteConfirmModal({
  notePath,
  onClose,
  onConfirm,
}: {
  notePath: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="vulcan-card w-full max-w-md p-6">
        <h3 className="mb-2 text-lg font-semibold text-[var(--color-foreground)]">
          노트 삭제
        </h3>
        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
          <span className="font-mono text-[var(--color-primary)]">{notePath}</span>
          을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="vulcan-button-ghost">
            취소
          </button>
          <button
            onClick={onConfirm}
            className="vulcan-button bg-[var(--color-destructive)] text-white hover:opacity-90"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 이름 변경 모달 ───────────────────────────────── */

function RenameNoteModal({
  currentPath,
  onClose,
  onRename,
}: {
  currentPath: string;
  onClose: () => void;
  onRename: (newPath: string) => void;
}) {
  const [newPath, setNewPath] = useState(currentPath);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = () => {
    let p = newPath.trim();
    if (!p || p === currentPath) return;
    if (!p.endsWith(".md")) p += ".md";
    onRename(p);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="vulcan-card w-full max-w-md p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
          노트 이름 변경
        </h3>
        <p className="mb-2 text-xs text-[var(--color-tertiary)]">
          현재: <span className="font-mono">{currentPath}</span>
        </p>
        <input
          ref={inputRef}
          type="text"
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="새 경로"
          className="vulcan-input mb-4 w-full"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="vulcan-button-ghost">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!newPath.trim() || newPath.trim() === currentPath}
            className="vulcan-button disabled:opacity-50"
          >
            변경
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 트리 노드 컴포넌트 (React.memo) ─────────────── */

const TreeItem = memo(function TreeItem({
  node,
  selectedPath,
  expandedFolders,
  onToggle,
  onSelect,
  depth,
}: {
  node: TreeNode;
  selectedPath: string | null;
  expandedFolders: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const isFolder = node.children.length > 0 && !node.note;
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = node.note && node.note.path === selectedPath;

  if (isFolder) {
    return (
      <div>
        <button
          onClick={() => onToggle(node.path)}
          className="vault-tree-item vault-tree-item--folder"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isExpanded ? (
            <FolderOpen size={14} className="shrink-0 text-[var(--color-primary)]" />
          ) : (
            <FolderClosed size={14} className="shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && (
          <div className="vault-tree-children">
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                selectedPath={selectedPath}
                expandedFolders={expandedFolders}
                onToggle={onToggle}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const displayName = node.note?.title ?? node.name.replace(/\.md$/, "");

  return (
    <button
      onClick={() => onSelect(node.note!.path)}
      className={`vault-tree-item ${isSelected ? "vault-tree-item--selected" : ""}`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <FileText size={14} className="shrink-0" />
      <span className="truncate">{displayName}</span>
      {node.note && (
        <span className="ml-auto shrink-0 text-[10px] text-[var(--color-tertiary)]" suppressHydrationWarning>
          {relativeTime(node.note.modified)}
        </span>
      )}
    </button>
  );
});

/* ── 검색 결과 목록 컴포넌트 ─────────────────────────── */

function SearchResultList({
  results,
  query,
  selectedPath,
  onSelect,
}: {
  results: (VaultNoteSummary & { snippet?: string })[];
  query: string;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="px-2 py-1 text-xs text-[var(--color-tertiary)]">
        {results.length}건 검색됨
      </p>
      {results.map((r) => (
        <button
          key={r.path}
          onClick={() => onSelect(r.path)}
          className={`flex w-full flex-col gap-1 rounded-[var(--radius-control)] px-3 py-3 min-h-[44px] text-left transition-colors ${
            r.path === selectedPath
              ? "border border-[var(--color-primary)] bg-[var(--color-primary-bg)]"
              : "hover:bg-[var(--color-muted)]"
          }`}
        >
          <span className="text-sm font-medium text-[var(--color-foreground)] truncate">
            {r.title}
          </span>
          <span className="text-[10px] text-[var(--color-tertiary)] truncate">
            {r.path}
          </span>
          {r.snippet && (
            <span
              className="text-xs text-[var(--color-muted-foreground)] line-clamp-2 [&_mark]:bg-yellow-500/30 [&_mark]:rounded [&_mark]:px-0.5"
              dangerouslySetInnerHTML={{
                __html: highlightSnippet(
                  r.snippet.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
                  query,
                ),
              }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

/* ── 메인 컴포넌트 ─────────────────────────────────── */

export function VaultExplorer({
  initialNotes,
  initialNotePath,
}: {
  initialNotes: VaultNoteSummary[];
  initialNotePath?: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [selectedPath, setSelectedPath] = useState<string | null>(initialNotePath ?? null);
  const [noteContent, setNoteContent] = useState<VaultNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<(VaultNoteSummary & { snippet?: string })[] | null>(null);
  const [clipUrl, setClipUrl] = useState("");
  const [clipping, setClipping] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set<string>(),
  );

  /* 편집 상태 */
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  /* 모달 상태 */
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  /* rename 상태 */
  const [showRenameModal, setShowRenameModal] = useState(false);

  /* 싱크 상태 */
  const [syncing, setSyncing] = useState(false);

  /* 패널 리사이즈 */
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const resizingRef = useRef(false);
  const resizeStartRef = useRef({ x: 0, width: 0 });

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    resizeStartRef.current = { x: e.clientX, width: sidebarWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizeStartRef.current.x;
      const newWidth = Math.min(600, Math.max(180, resizeStartRef.current.width + delta));
      setSidebarWidth(newWidth);
    };

    const handleUp = () => {
      resizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }, [sidebarWidth]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { toasts, show: showToast } = useToast();
  const initialLoadDone = useRef(false);

  /* 수동 싱크 — NAS와 bisync 후 vault 노트 목록 새로고침 */
  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/vault/sync", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === "string" ? err.error : `${res.status}`);
      }
      const data = await res.json();
      setNotes(data.notes ?? []);
      // 현재 열린 노트도 새로고침
      if (selectedPath) {
        const noteRes = await fetch(`/api/vault/notes/${encodeURIComponent(selectedPath)}`);
        const noteData = await noteRes.json();
        if (noteData.note) setNoteContent(noteData.note);
      }
      showToast("success", data.message ?? "NAS와 볼트 동기화 완료");
    } catch (err) {
      showToast("error", `동기화 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setSyncing(false);
    }
  }, [selectedPath, showToast]);

  /* 검색 */
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      const res = await fetch("/api/vault/notes");
      const data = await res.json();
      setNotes(data.notes ?? []);
      setSearchResults(null);
      return;
    }
    const res = await fetch("/api/vault/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q }),
    });
    const data = await res.json();
    const results = data.results ?? [];
    setNotes(results);
    setSearchResults(results);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  /* 노트 선택 + URL 업데이트 */
  const selectNote = useCallback(async (path: string) => {
    setEditing(false);
    setShowPreview(false);
    setSelectedPath(path);
    setLoading(true);

    // URL 딥링크 업데이트 — pushState로 서버 재호출 방지
    window.history.pushState(null, "", `/vault?note=${encodeURIComponent(path)}`);

    try {
      const res = await fetch(`/api/vault/notes/${encodeURIComponent(path)}`);
      const data = await res.json();
      setNoteContent(data.note ?? null);
    } catch {
      setNoteContent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* 초기 딥링크 로드 */
  useEffect(() => {
    if (initialNotePath && !initialLoadDone.current) {
      initialLoadDone.current = true;
      selectNote(initialNotePath);
    }
  }, [initialNotePath, selectNote]);

  /* 위키링크 클릭 → 노트 이동 */
  const handleWikiLink = useCallback(
    (notePath: string) => {
      const target = notes.find(
        (n) =>
          n.path === notePath ||
          n.path === `${notePath}.md` ||
          n.title === notePath,
      );
      if (target) {
        selectNote(target.path);
      } else {
        selectNote(`${notePath}.md`);
      }
    },
    [notes, selectNote],
  );

  /* 클리핑 */
  const handleClip = useCallback(async () => {
    if (!clipUrl.trim()) return;
    setClipping(true);
    try {
      const res = await fetch("/api/vault/clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: clipUrl }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setClipUrl("");
      showToast("success", "클리핑 완료");
      doSearch(query);
    } catch {
      showToast("error", "클리핑 실패 — URL을 확인해주세요");
    } finally {
      setClipping(false);
    }
  }, [clipUrl, query, doSearch, showToast]);

  /* 편집 모드 진입 */
  const startEditing = useCallback(() => {
    if (!noteContent) return;
    setEditContent(noteContent.content);
    setEditing(true);
    setShowPreview(false);
  }, [noteContent]);

  /* 편집 취소 */
  const cancelEditing = useCallback(() => {
    setEditing(false);
    setShowPreview(false);
  }, []);

  /* 노트 저장 */
  const saveNote = useCallback(async () => {
    if (!noteContent || !selectedPath) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/vault/notes/${encodeURIComponent(selectedPath)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editContent }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `${res.status}`);
      }
      const data = await res.json();
      setNoteContent(data.note);
      setEditing(false);
      setShowPreview(false);
      showToast("success", "저장 완료");
      doSearch(query);
    } catch (err) {
      showToast("error", `저장 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setSaving(false);
    }
  }, [noteContent, selectedPath, editContent, query, doSearch, showToast]);

  /* 새 노트 생성 */
  const handleCreateNote = useCallback(
    async (path: string) => {
      try {
        const res = await fetch("/api/vault/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, content: "" }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? `${res.status}`);
        }
        setShowNewNoteModal(false);
        showToast("success", "노트 생성 완료");
        await doSearch(query);
        selectNote(path);
      } catch (err) {
        showToast(
          "error",
          `생성 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`,
        );
      }
    },
    [query, doSearch, selectNote, showToast],
  );

  /* 노트 삭제 */
  const handleDeleteNote = useCallback(async () => {
    if (!selectedPath) return;
    try {
      const res = await fetch(
        `/api/vault/notes/${encodeURIComponent(selectedPath)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `${res.status}`);
      }
      setShowDeleteModal(false);
      setSelectedPath(null);
      setNoteContent(null);
      setEditing(false);
      window.history.pushState(null, "", "/vault");
      showToast("success", "노트 삭제 완료");
      doSearch(query);
    } catch (err) {
      showToast(
        "error",
        `삭제 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`,
      );
    }
  }, [selectedPath, query, doSearch, showToast]);

  /* 노트 이름 변경 */
  const handleRenameNote = useCallback(
    async (newPath: string) => {
      if (!selectedPath) return;
      try {
        const res = await fetch(
          `/api/vault/notes/${encodeURIComponent(selectedPath)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newPath }),
          },
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? `${res.status}`);
        }
        const data = await res.json();
        setShowRenameModal(false);
        setSelectedPath(data.note.path);
        setNoteContent(data.note);
        window.history.pushState(null, "", `/vault?note=${encodeURIComponent(data.note.path)}`);
        showToast("success", "이름 변경 완료");
        doSearch(query);
      } catch (err) {
        showToast(
          "error",
          `이름 변경 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`,
        );
      }
    },
    [selectedPath, query, doSearch, showToast],
  );

  /* 이미지 붙여넣기/업로드 */
  const handleImageUpload = useCallback(
    async (file: File) => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/vault/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? `${res.status}`);
        }
        const data = await res.json();
        const mdImage = `![${data.fileName}](${data.relativePath})`;
        setEditContent((prev) => prev + `\n${mdImage}\n`);
        showToast("success", `이미지 업로드: ${data.fileName}`);
      } catch (err) {
        showToast(
          "error",
          `업로드 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`,
        );
      }
    },
    [showToast],
  );

  /* 폴더 토글 */
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const tree = useMemo(() => buildTree(notes), [notes]);

  /* 태그 추출 */
  const tags: string[] = useMemo(() => {
    if (!noteContent?.frontmatter) return [];
    const t = noteContent.frontmatter.tags;
    if (Array.isArray(t)) return t.map(String);
    if (typeof t === "string") return t.split(",").map((s) => s.trim());
    return [];
  }, [noteContent]);

  return (
    <div className="flex flex-col gap-4" style={{ height: "calc(100dvh - 8rem)" }}>
      {/* Toast */}
      <ToastContainer toasts={toasts} />

      {/* 모달 */}
      {showNewNoteModal && (
        <NewNoteModal
          onClose={() => setShowNewNoteModal(false)}
          onCreate={handleCreateNote}
        />
      )}
      {showDeleteModal && selectedPath && (
        <DeleteConfirmModal
          notePath={selectedPath}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteNote}
        />
      )}
      {showRenameModal && selectedPath && (
        <RenameNoteModal
          currentPath={selectedPath}
          onClose={() => setShowRenameModal(false)}
          onRename={handleRenameNote}
        />
      )}

      {/* 상단 바 */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-tertiary)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색..."
            className="vulcan-input has-icon"
          />
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="vulcan-button-ghost flex shrink-0 items-center justify-center min-h-[44px] min-w-[44px] p-2"
          title="볼트 동기화"
        >
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
        </button>
        <button
          onClick={() => setShowNewNoteModal(true)}
          className="vulcan-button-ghost flex shrink-0 items-center justify-center min-h-[44px] min-w-[44px] p-2"
          title="새 노트"
        >
          <FilePlus size={16} />
        </button>
        <div className="vault-clip-area hidden items-center gap-2 lg:flex">
          <div className="relative w-64">
            <Link
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-tertiary)]"
            />
            <input
              type="text"
              value={clipUrl}
              onChange={(e) => setClipUrl(e.target.value)}
              placeholder="URL 클리핑..."
              className="vulcan-input has-icon"
              onKeyDown={(e) => e.key === "Enter" && handleClip()}
            />
          </div>
          <button
            onClick={handleClip}
            disabled={clipping || !clipUrl.trim()}
            className="vulcan-button flex shrink-0 items-center gap-2 disabled:opacity-50"
          >
            {clipping ? <Loader2 size={14} className="animate-spin" /> : null}
            Clip
          </button>
        </div>
      </div>

      {/* 메인 그리드 */}
      <div className="flex min-h-0 flex-1 gap-0">
        {/* 왼쪽 — 파일 트리 or 검색 결과 */}
        <div
          className={`vulcan-card flex flex-col overflow-hidden p-2 vault-mobile-list ${selectedPath ? "vault-mobile-list--hidden" : ""}`}
          style={{ width: `${sidebarWidth}px`, minWidth: "180px", maxWidth: "600px", flexShrink: 0 }}
        >
          <div className="vault-sidebar-scroll">
            {searchResults && query.trim() ? (
              <SearchResultList
                results={searchResults}
                query={query}
                selectedPath={selectedPath}
                onSelect={selectNote}
              />
            ) : tree.length === 0 ? (
              <p className="p-4 text-center text-sm text-[var(--color-tertiary)]">
                노트가 없습니다
              </p>
            ) : (
              tree.map((node) => (
                <TreeItem
                  key={node.path}
                  node={node}
                  selectedPath={selectedPath}
                  expandedFolders={expandedFolders}
                  onToggle={toggleFolder}
                  onSelect={selectNote}
                  depth={0}
                />
              ))
            )}
          </div>
        </div>

        {/* 리사이즈 핸들 */}
        <div
          className="vault-resize-handle"
          onMouseDown={handleResizeStart}
        />

        {/* 오른쪽 — 본문 뷰어/에디터 */}
        <div className={`vulcan-card flex min-w-0 flex-1 flex-col overflow-hidden vault-mobile-content ${selectedPath ? "vault-mobile-content--visible" : ""}`}>
          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <Loader2
                size={32}
                className="animate-spin text-[var(--color-primary)]"
              />
              <span className="text-sm text-[var(--color-tertiary)]">로딩 중...</span>
            </div>
          ) : noteContent ? (
            <div className="flex h-full flex-col overflow-hidden">
              {/* 메타 헤더 + 액션 버튼 */}
              <div className="vault-note-header flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedPath(null);
                        setNoteContent(null);
                        window.history.pushState(null, "", "/vault");
                      }}
                      className="vault-back-btn"
                      title="목록으로"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <h2 className="text-xl font-semibold text-[var(--color-foreground)] truncate">
                      {noteContent.title}
                    </h2>
                  </div>
                  <div className="vault-breadcrumb">
                    {noteContent.path.split("/").map((seg, i, arr) => (
                      <span key={i}>
                        <span>{seg}</span>
                        {i < arr.length - 1 && <span className="vault-breadcrumb-sep">/</span>}
                      </span>
                    ))}
                    <span className="vault-breadcrumb-sep">·</span>
                    <span suppressHydrationWarning>{relativeTime(noteContent.modified)}</span>
                  </div>
                  {tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span key={tag} className="vault-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 self-end lg:ml-4 lg:gap-1.5">
                  {editing ? (
                    <>
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`vulcan-button-ghost p-2 ${showPreview ? "text-[var(--color-primary)]" : ""}`}
                        title={showPreview ? "프리뷰 닫기" : "프리뷰 열기"}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={saveNote}
                        disabled={saving}
                        className="vulcan-button flex items-center gap-1.5 text-sm"
                        title="저장 (Ctrl+S)"
                      >
                        {saving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        <span className="hidden sm:inline">저장</span>
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="vulcan-button-ghost p-2"
                        title="취소 (Esc)"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={startEditing}
                        className="vulcan-button-ghost flex items-center gap-1.5 p-2 text-sm"
                        title="편집"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => setShowRenameModal(true)}
                        className="vulcan-button-ghost p-2"
                        title="이름 변경"
                      >
                        <FileEdit size={16} />
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="vulcan-button-ghost p-2 text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 본문 영역 */}
              {editing ? (
                <div className={`flex min-h-0 flex-1 ${showPreview ? "lg:divide-x lg:divide-[var(--color-border)]" : ""}`}>
                  <div className={`min-h-0 ${showPreview ? "hidden lg:block lg:w-1/2" : "w-full"}`}>
                    <MarkdownEditor
                      value={editContent}
                      onChange={setEditContent}
                      onSave={saveNote}
                      onCancel={cancelEditing}
                      onImagePaste={handleImageUpload}
                    />
                  </div>
                  {showPreview && (
                    <div className="vault-content-pane w-full lg:w-1/2">
                      <MarkdownRenderer
                        content={editContent}
                        onWikiLink={handleWikiLink}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="vault-content-pane">
                  <MarkdownRenderer
                    content={noteContent.content}
                    onWikiLink={handleWikiLink}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="vault-empty-state">
              <div className="text-center">
                <FileText size={48} className="mx-auto vault-empty-icon" />
                <p className="vault-empty-text">노트를 선택하세요</p>
                <p className="vault-empty-hint">
                  <span className="hidden lg:inline">왼쪽 트리에서 파일을 클릭하거나 검색하세요</span>
                  <span className="lg:hidden">목록에서 노트를 선택하세요</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
