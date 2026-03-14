"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Agent, EventItem, Task, TaskComment, TaskLane, TaskPriority, WorkOrder } from "@/lib/types";
import { Activity, MessageSquare, Send, Trash2, X } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const [activityEvents, setActivityEvents] = useState<EventItem[]>([]);
  const [activityWorkOrders, setActivityWorkOrders] = useState<WorkOrder[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

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
    if (!task || activeTab !== "activity") return;
    setLoadingActivity(true);
    fetch(`/api/tasks/${task.id}/activity`)
      .then((res) => res.json())
      .then((data) => {
        setActivityEvents(data.events ?? []);
        setActivityWorkOrders(data.workOrders ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingActivity(false));
  }, [task, activeTab]);

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
      alert("저장에 실패했습니다.");
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
      alert("삭제에 실패했습니다.");
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
      alert("댓글 등록에 실패했습니다.");
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

        {/* Tab Navigation */}
        {!isCreate && (
          <div className="flex border-b border-[var(--color-border)] px-5">
            <button
              type="button"
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === "details"
                  ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              }`}
              onClick={() => setActiveTab("details")}
            >
              상세
            </button>
            <button
              type="button"
              className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === "activity"
                  ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              }`}
              onClick={() => setActiveTab("activity")}
            >
              <Activity size={12} />
              에이전트 활동
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {activeTab === "activity" && !isCreate ? (
            <AgentActivityTab
              events={activityEvents}
              workOrders={activityWorkOrders}
              loading={loadingActivity}
            />
          ) : (
          <>
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
          </>
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

function AgentActivityTab({
  events,
  workOrders,
  loading,
}: {
  events: EventItem[];
  workOrders: WorkOrder[];
  loading: boolean;
}) {
  if (loading) {
    return <p className="py-6 text-center text-xs text-[var(--color-tertiary)]">로딩 중...</p>;
  }

  return (
    <div className="space-y-4">
      {/* WorkOrders */}
      {workOrders.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold text-[var(--color-muted-foreground)]">연결된 WorkOrder</h4>
          <div className="space-y-2">
            {workOrders.map((wo) => {
              const statusColor =
                wo.status === "in_progress" ? "var(--color-primary)"
                : wo.status === "completed" ? "var(--color-success)"
                : wo.status === "failed" ? "var(--color-destructive)"
                : "var(--color-muted-foreground)";

              return (
                <div
                  key={wo.id}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)]/50 p-3"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--color-foreground)]">{wo.summary}</span>
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
                        color: statusColor,
                      }}
                    >
                      {wo.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-tertiary)]">
                    <span>{wo.fromAgentId} → {wo.toAgentId}</span>
                    <span>{wo.type}</span>
                    {wo.completedAt && <span>완료: {formatDate(wo.completedAt)}</span>}
                  </div>
                  {wo.acceptanceCriteria.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">수락 기준:</p>
                      <ul className="ml-3 list-disc text-[11px] text-[var(--color-tertiary)]">
                        {wo.acceptanceCriteria.map((criterion: string, idx: number) => (
                          <li key={idx}>{criterion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event Log */}
      <div>
        <h4 className="mb-2 text-xs font-semibold text-[var(--color-muted-foreground)]">
          이벤트 로그
          {events.length > 0 && <span className="vulcan-chip ml-2 text-[10px]">{events.length}</span>}
        </h4>
        {events.length > 0 ? (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-2 rounded border border-[var(--color-border)]/50 bg-[var(--color-background)]/30 px-2 py-1.5"
              >
                <span className="vulcan-chip text-[9px]">{event.type}</span>
                <span className="flex-1 truncate text-xs text-[var(--color-foreground)]">{event.summary}</span>
                <span className="text-[10px] text-[var(--color-tertiary)]">
                  {new Date(event.ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-[var(--color-tertiary)]">관련 이벤트 없음</p>
        )}
      </div>
    </div>
  );
}
