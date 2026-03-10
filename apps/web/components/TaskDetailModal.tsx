"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Agent, Task, TaskComment, TaskLane, TaskPriority } from "@/lib/types";
import { MessageSquare, Send, Trash2, X } from "lucide-react";

const LANES: Array<{ key: TaskLane; label: string }> = [
  { key: "backlog", label: "Backlog" },
  { key: "queued", label: "Queued" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
  { key: "archived", label: "Archived" },
];

const PRIORITIES: Array<{ key: TaskPriority; label: string }> = [
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

interface TaskDetailModalProps {
  task: Task | null;
  agents: Agent[];
  onClose: () => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskCreated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TaskDetailModal({
  task,
  agents,
  onClose,
  onTaskUpdated,
  onTaskCreated,
  onTaskDeleted,
}: TaskDetailModalProps) {
  const isCreate = task === null;
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [lane, setLane] = useState<TaskLane>(task?.lane ?? "backlog");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [assigneeAgentId, setAssigneeAgentId] = useState(task?.assigneeAgentId ?? "");
  const [tags, setTags] = useState(task?.tags.join(", ") ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!task) return;
    setLoadingComments(true);
    fetch(`/api/tasks/${task.id}/comments`)
      .then((res) => res.json())
      .then((data) => setComments(data.comments ?? []))
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [task]);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);

    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (isCreate) {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            lane,
            priority,
            assigneeAgentId: assigneeAgentId || null,
            tags: parsedTags,
          }),
        });
        if (!res.ok) throw new Error("create failed");
        const data = await res.json();
        onTaskCreated?.(data.task);
      } else {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            lane,
            priority,
            assigneeAgentId: assigneeAgentId || null,
            tags: parsedTags,
          }),
        });
        if (!res.ok) throw new Error("update failed");
        const data = await res.json();
        onTaskUpdated?.(data.task);
      }
    } catch {
      // 실패 시 무시
    } finally {
      setSaving(false);
    }
  }, [
    title,
    description,
    lane,
    priority,
    assigneeAgentId,
    tags,
    isCreate,
    task,
    onTaskCreated,
    onTaskUpdated,
  ]);

  const handleDelete = useCallback(async () => {
    if (!task || !confirm("정말 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      onTaskDeleted?.(task.id);
    } catch {
      // 실패 시 무시
    } finally {
      setDeleting(false);
    }
  }, [task, onTaskDeleted]);

  const handleAddComment = useCallback(async () => {
    if (!task || !newComment.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (!res.ok) throw new Error("comment failed");
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]);
      setNewComment("");
    } catch {
      // 실패 시 무시
    }
  }, [task, newComment]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            {isCreate ? "New Task" : `Task #${task.id.split("-")[0]}`}
          </h2>
          <div className="flex items-center gap-2">
            {!isCreate && onTaskDeleted && (
              <button
                type="button"
                className="rounded p-1 text-[var(--color-destructive-text)] hover:bg-[var(--color-destructive-bg)]"
                onClick={handleDelete}
                disabled={deleting}
                title="Delete task"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              className="rounded p-1 text-[var(--color-tertiary)] hover:bg-[var(--color-muted)]"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
              Title
            </label>
            <input
              className="vulcan-input w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
              Description
            </label>
            <textarea
              className="vulcan-input w-full"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description..."
            />
          </div>

          {/* Lane + Priority + Assignee */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                Lane
              </label>
              <select
                className="vulcan-input w-full"
                value={lane}
                onChange={(e) => setLane(e.target.value as TaskLane)}
              >
                {LANES.map((l) => (
                  <option key={l.key} value={l.key}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                Priority
              </label>
              <select
                className="vulcan-input w-full"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                Assignee
              </label>
              <select
                className="vulcan-input w-full"
                value={assigneeAgentId}
                onChange={(e) => setAssigneeAgentId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
              Tags (comma-separated)
            </label>
            <input
              className="vulcan-input w-full"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. frontend, bugfix, urgent"
            />
          </div>

          {/* Metadata (view only) */}
          {!isCreate && (
            <div className="flex gap-4 text-xs text-[var(--color-tertiary)]">
              <span>Created: {formatDate(task.createdAt)}</span>
              <span>Updated: {formatDate(task.updatedAt)}</span>
            </div>
          )}

          {/* Comments */}
          {!isCreate && (
            <div className="border-t border-[var(--color-border)] pt-4">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-foreground)]">
                <MessageSquare size={14} />
                Comments
                {comments.length > 0 && (
                  <span className="vulcan-chip text-[10px]">{comments.length}</span>
                )}
              </h3>

              {loadingComments ? (
                <p className="text-xs text-[var(--color-tertiary)]">Loading...</p>
              ) : (
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)]/50 p-2"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                          {comment.author}
                        </span>
                        <span className="text-[10px] text-[var(--color-tertiary)]">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-foreground)]">{comment.content}</p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-xs text-[var(--color-tertiary)]">No comments yet.</p>
                  )}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  className="vulcan-input flex-1"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleAddComment();
                    }
                  }}
                />
                <button
                  type="button"
                  className="flex items-center gap-1 rounded border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1 text-xs text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 disabled:opacity-50"
                  onClick={() => void handleAddComment()}
                  disabled={!newComment.trim()}
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3">
          <button
            type="button"
            className="rounded border border-[var(--color-border)] px-4 py-1.5 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
            onClick={() => void handleSave()}
            disabled={saving || !title.trim()}
          >
            {saving ? "Saving..." : isCreate ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
