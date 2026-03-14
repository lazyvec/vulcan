"use client";

import { useCallback, useMemo, useState } from "react";
import type { MemoryItem } from "@/lib/types";
import { Book, Clock, Edit2, Lightbulb, Star, Trash2, User } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

const API_BASE = "";

type ContainerKey = "journal" | "longterm" | "profile" | "lesson";

interface MemoryBoardProps {
  journal: MemoryItem[];
  longterm: MemoryItem[];
  profile: MemoryItem[];
  lesson: MemoryItem[];
  initialQuery?: string;
}

const TAB_META: Record<ContainerKey, { label: string; icon: typeof Clock; emptyMsg: string }> = {
  journal: { label: "일일 저널", icon: Clock, emptyMsg: "저널 항목이 없습니다." },
  longterm: { label: "장기 기억", icon: Book, emptyMsg: "장기 기억 항목이 없습니다." },
  profile: { label: "프로필", icon: User, emptyMsg: "프로필 항목이 없습니다." },
  lesson: { label: "교훈", icon: Lightbulb, emptyMsg: "교훈 항목이 없습니다." },
};

function matches(item: MemoryItem, q: string) {
  const target = `${item.title} ${item.content} ${item.tags.join(" ")}`.toLowerCase();
  return target.includes(q);
}

function isExpiringSoon(item: MemoryItem): boolean {
  if (!item.expiresAt) return false;
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  return item.expiresAt - Date.now() < threeDays && item.expiresAt > Date.now();
}

function ImportanceDots({ value }: { value?: number }) {
  if (value === undefined || value === null) return null;
  const filled = Math.round(value * 5);
  return (
    <span className="ml-2 inline-flex items-center gap-0.5" title={`중요도: ${(value * 100).toFixed(0)}%`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={12}
          className={i < filled ? "fill-[var(--color-hearth)] text-[var(--color-hearth)]" : "text-[var(--color-border)]"}
        />
      ))}
    </span>
  );
}

function MemoryCard({
  item,
  onEdit,
  onDelete,
}: {
  item: MemoryItem;
  onEdit: (item: MemoryItem) => void;
  onDelete: (id: string) => void;
}) {
  const expiring = isExpiringSoon(item);

  return (
    <article
      className={`vulcan-card p-4 transition-colors hover:bg-[var(--color-surface-hover)] ${
        expiring ? "border-l-2 border-l-[var(--color-warning)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[var(--color-foreground)] truncate">{item.title}</h3>
            <ImportanceDots value={item.importance} />
          </div>
          <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">{item.content}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-[var(--color-tertiary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)] cursor-pointer"
            title="편집"
          >
            <Edit2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-[var(--color-tertiary)] transition-colors hover:bg-[var(--color-destructive-bg)] hover:text-[var(--color-destructive-text)] cursor-pointer"
            title="삭제"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {item.memoryType && (
          <span className="rounded bg-[var(--color-surface-hover)] px-1.5 py-0.5 text-xs text-[var(--color-tertiary)]">
            {item.memoryType}
          </span>
        )}
        {item.tags.length > 0 &&
          item.tags.map((tag) => (
            <span key={tag} className="vulcan-chip text-xs">
              #{tag}
            </span>
          ))}
        {expiring && (
          <span className="rounded bg-[var(--color-warning-bg)] px-1.5 py-0.5 text-xs text-[var(--color-warning-text)]">
            만료 임박
          </span>
        )}
      </div>
    </article>
  );
}

function EditModal({
  item,
  onClose,
  onSave,
}: {
  item: MemoryItem;
  onClose: () => void;
  onSave: (id: string, patch: { title: string; content: string; tags: string[] }) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content);
  const [tagsStr, setTagsStr] = useState(item.tags.join(", "));

  return (
    <Modal
      open
      onClose={onClose}
      title="메모리 편집"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={() => {
            const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
            onSave(item.id, { title, content, tags });
          }}>저장</Button>
        </>
      }
    >
      <div className="space-y-3">
        <input className="vulcan-input w-full" placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="vulcan-input w-full min-h-[100px] resize-y" placeholder="내용" value={content} onChange={(e) => setContent(e.target.value)} />
        <input className="vulcan-input w-full" placeholder="태그 (쉼표 구분)" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} />
      </div>
    </Modal>
  );
}

export function MemoryBoard({
  journal: initJournal,
  longterm: initLongterm,
  profile: initProfile,
  lesson: initLesson,
  initialQuery = "",
}: MemoryBoardProps) {
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<ContainerKey>("journal");
  const [editing, setEditing] = useState<MemoryItem | null>(null);

  const { toast } = useToast();

  const [items, setItems] = useState<Record<ContainerKey, MemoryItem[]>>({
    journal: initJournal,
    longterm: initLongterm,
    profile: initProfile,
    lesson: initLesson,
  });

  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(
    () => (normalized ? items[activeTab].filter((item) => matches(item, normalized)) : items[activeTab]),
    [items, activeTab, normalized],
  );

  const tabItems = useMemo(
    () =>
      (Object.keys(TAB_META) as ContainerKey[]).map((key) => ({
        key,
        label: TAB_META[key].label,
        count: items[key].length,
      })),
    [items],
  );

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/memory/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setItems((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(updated) as ContainerKey[]) {
          updated[key] = updated[key].filter((item) => item.id !== id);
        }
        return updated;
      });
    } catch {
      toast("error", "삭제에 실패했습니다.");
    }
  }, [toast]);

  const handleSave = useCallback(async (id: string, patch: { title: string; content: string; tags: string[] }) => {
    try {
      const res = await fetch(`${API_BASE}/api/memory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        toast("error", "저장에 실패했습니다.");
        return;
      }
      const { memory: updated } = (await res.json()) as { memory: MemoryItem };
      setItems((prev) => {
        const result = { ...prev };
        for (const key of Object.keys(result) as ContainerKey[]) {
          result[key] = result[key].map((item) => (item.id === id ? updated : item));
        }
        return result;
      });
      setEditing(null);
      toast("success", "저장되었습니다.");
    } catch {
      toast("error", "저장에 실패했습니다.");
    }
  }, [toast]);

  const meta = TAB_META[activeTab];
  const Icon = meta.icon;

  return (
    <div>
      <div className="mb-4">
        <input
          className="vulcan-input max-w-sm"
          placeholder="메모리 검색..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <Tabs items={tabItems} activeKey={activeTab} onChange={(k) => setActiveTab(k as ContainerKey)} className="mb-4" />

      <div className="mb-3 flex items-center gap-2">
        <Icon size={18} className="text-[var(--color-tertiary)]" />
        <h2 className="text-lg font-semibold">{meta.label}</h2>
      </div>

      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((item) => (
            <MemoryCard key={item.id} item={item} onEdit={setEditing} onDelete={handleDelete} />
          ))
        ) : (
          <EmptyState message={meta.emptyMsg} />
        )}
      </div>

      {editing && <EditModal item={editing} onClose={() => setEditing(null)} onSave={handleSave} />}
    </div>
  );
}
