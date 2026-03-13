"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Agent, Task, TaskLane, TaskPriority, WorkOrder } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Eye,
  Flame,
  Inbox,
  ListChecks,
  Archive,
  Plus,
} from "lucide-react";
import { TaskDetailModal } from "./TaskDetailModal";

const LANES: Array<{ key: TaskLane; label: string; note: string }> = [
  { key: "backlog", label: "백로그", note: "정리 대기" },
  { key: "queued", label: "대기", note: "실행 대기" },
  { key: "in_progress", label: "진행 중", note: "실행 중" },
  { key: "review", label: "검토", note: "검토 대기" },
  { key: "done", label: "완료", note: "완료" },
  { key: "archived", label: "보관", note: "보관" },
];

interface KanbanBoardProps {
  initialTasks: Task[];
  agents: Agent[];
  initialQuery?: string;
  workOrdersByTaskId?: Record<string, WorkOrder>;
}

function Avatar({ agent }: { agent?: Agent }) {
  const initials = agent?.name.slice(0, 2).toUpperCase() ?? "?";
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] text-xs font-bold text-[var(--color-muted-foreground)]">
      {initials}
    </div>
  );
}

function laneIcon(lane: TaskLane) {
  switch (lane) {
    case "backlog":
      return <Inbox size={14} className="text-[var(--color-tertiary)]" />;
    case "queued":
      return <CircleDashed size={14} className="text-[var(--color-tertiary)]" />;
    case "in_progress":
      return <Clock3 size={14} className="text-[var(--color-primary)]" />;
    case "review":
      return <Eye size={14} className="text-[var(--color-info)]" />;
    case "done":
      return <CheckCircle2 size={14} className="text-[var(--color-success)]" />;
    case "archived":
      return <Archive size={14} className="text-[var(--color-tertiary)]" />;
  }
}

function priorityIcon(priority: TaskPriority) {
  switch (priority) {
    case "critical":
      return <Flame size={12} className="text-[var(--color-destructive)]" />;
    case "high":
      return <AlertTriangle size={12} className="text-[var(--color-primary)]" />;
    case "medium":
      return <ArrowUp size={12} className="text-[var(--color-warning)]" />;
    case "low":
      return <ArrowDown size={12} className="text-[var(--color-tertiary)]" />;
  }
}

const priorityLabels: Record<TaskPriority, string> = {
  critical: "긴급",
  high: "높음",
  medium: "보통",
  low: "낮음",
};

function priorityLabel(priority: TaskPriority) {
  return priorityLabels[priority];
}

function formatUpdatedAt(ts: number) {
  return new Date(ts).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function WorkOrderBadge({ workOrder }: { workOrder: WorkOrder }) {
  const statusColor =
    workOrder.status === "in_progress" ? "var(--color-primary)"
    : workOrder.status === "completed" ? "var(--color-success)"
    : workOrder.status === "failed" ? "var(--color-destructive)"
    : "var(--color-muted-foreground)";

  return (
    <div className="flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-background)]/50 px-1.5 py-0.5">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: statusColor }}
      />
      <span className="text-[9px] text-[var(--color-muted-foreground)]">
        WO:{workOrder.status}
      </span>
      <span className="text-[9px] text-[var(--color-tertiary)]">
        {workOrder.fromAgentId}→{workOrder.toAgentId}
      </span>
    </div>
  );
}

function SortableTaskCard({
  task,
  agent,
  workOrder,
  onOpenDetail,
}: {
  task: Task;
  agent?: Agent;
  workOrder?: WorkOrder;
  onOpenDetail: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm transition-colors hover:bg-[var(--color-muted)]/45 active:cursor-grabbing"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium text-[var(--color-foreground)]">
          {task.title}
        </p>
        <Avatar agent={agent} />
      </div>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-[var(--color-tertiary)]">
          {priorityIcon(task.priority)}
          {priorityLabel(task.priority)}
        </span>
        {task.tags.length > 0 && (
          <div className="flex items-center gap-1">
            {task.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="vulcan-chip text-[10px]"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 2 && (
              <span className="text-[10px] text-[var(--color-tertiary)]">
                +{task.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
      {workOrder && (
        <div className="mb-2">
          <WorkOrderBadge workOrder={workOrder} />
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs text-[var(--color-muted-foreground)]">
          #{task.id.split("-")[0]} · {formatUpdatedAt(task.updatedAt)}
        </p>
        <button
          type="button"
          className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-0.5 text-[10px] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onOpenDetail(task)}
        >
          상세
        </button>
      </div>
    </article>
  );
}

function TaskCardOverlay({ task, agent }: { task: Task; agent?: Agent }) {
  return (
    <article className="w-[280px] rounded-lg border border-[var(--color-primary)] bg-[var(--color-surface)] p-3 opacity-90 shadow-lg">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium text-[var(--color-foreground)]">
          {task.title}
        </p>
        <Avatar agent={agent} />
      </div>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-[var(--color-tertiary)]">
          {priorityIcon(task.priority)}
          {priorityLabel(task.priority)}
        </span>
      </div>
    </article>
  );
}

function DroppableLane({
  lane,
  tasks,
  agentMap,
  count,
  onOpenDetail,
  workOrdersByTaskId,
}: {
  lane: (typeof LANES)[number];
  tasks: Task[];
  agentMap: Map<string, Agent>;
  count: number;
  onOpenDetail: (task: Task) => void;
  workOrdersByTaskId: Record<string, WorkOrder>;
}) {
  const taskIds = tasks.map((t) => t.id);

  return (
    <div className="flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/75 p-2 lg:min-w-[200px] lg:snap-center">
      <div className="mb-3 flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2">
        <div className="flex items-center gap-1.5">
          {laneIcon(lane.key)}
          <div>
            <h3 className="font-semibold text-[var(--color-foreground)]">{lane.label}</h3>
            <p className="text-[11px] text-[var(--color-tertiary)]">{lane.note}</p>
          </div>
        </div>
        <span className="text-sm font-medium text-[var(--color-muted-foreground)]">{count}</span>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 overflow-y-auto p-1" data-lane={lane.key}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              agent={agentMap.get(task.assigneeAgentId ?? "")}
              workOrder={workOrdersByTaskId[task.id]}
              onOpenDetail={onOpenDetail}
            />
          ))}
          {tasks.length === 0 && (
            <EmptyState message="태스크 없음" />
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({ initialTasks, agents, initialQuery = "", workOrdersByTaskId = {} }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [query, setQuery] = useState(initialQuery);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const agentMap = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const queryMatch =
        !normalized ||
        task.title.toLowerCase().includes(normalized) ||
        task.id.toLowerCase().includes(normalized) ||
        (task.description?.toLowerCase().includes(normalized) ?? false);
      const assigneeMatch =
        assigneeFilter === "all" || task.assigneeAgentId === assigneeFilter;
      const priorityMatch = priorityFilter === "all" || task.priority === priorityFilter;
      return queryMatch && assigneeMatch && priorityMatch;
    });
  }, [assigneeFilter, priorityFilter, query, tasks]);

  const laneCounts = useMemo(
    () =>
      Object.fromEntries(
        LANES.map((lane) => [lane.key, filtered.filter((task) => task.lane === lane.key).length]),
      ) as Record<TaskLane, number>,
    [filtered],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const taskId = event.active.id as string;
      const task = tasks.find((t) => t.id === taskId) ?? null;
      setActiveTask(task);
    },
    [tasks],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTask(null);

      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // over가 다른 task이면, 그 task의 lane으로 이동
      const overTask = tasks.find((t) => t.id === over.id);
      let targetLane: TaskLane | null = null;

      if (overTask && overTask.id !== taskId) {
        targetLane = overTask.lane;
      } else {
        // lane 컨테이너에 드롭된 경우 — data-lane attribute로 확인
        const overElement = document.querySelector(`[data-lane]`);
        if (overElement) {
          // over.id가 lane key와 매칭되는 경우도 처리
          const laneKey = LANES.find((l) => l.key === over.id)?.key;
          if (laneKey) targetLane = laneKey;
        }
      }

      if (!targetLane || targetLane === task.lane) return;

      const snapshot = [...tasks];
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, lane: targetLane, updatedAt: Date.now() } : t)),
      );

      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lane: targetLane }),
        });
        if (!response.ok) throw new Error("failed to move task");
      } catch {
        setTasks(snapshot);
      }
    },
    [tasks],
  );

  const handleOpenDetail = useCallback((task: Task) => {
    setDetailTask(task);
  }, []);

  const handleTaskUpdated = useCallback((updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setDetailTask(updated);
  }, []);

  const handleTaskCreated = useCallback((created: Task) => {
    setTasks((prev) => [created, ...prev]);
    setShowCreateModal(false);
  }, []);

  const handleTaskDeleted = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setDetailTask(null);
  }, []);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/70 p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-lg font-semibold text-[var(--color-foreground)]">
            <ListChecks size={18} className="mr-1 inline" />
            태스크 보드
          </h2>
          <span className="vulcan-chip text-xs">전체 {filtered.length}</span>
          <span className="vulcan-chip text-xs">에이전트 {agents.length}</span>
          <button
            type="button"
            className="flex items-center gap-1 rounded border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={12} />
            새 태스크
          </button>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row">
          <input
            className="vulcan-input w-full lg:max-w-sm"
            placeholder="제목, 설명 또는 ID로 검색..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            className="vulcan-input w-full lg:w-44"
            aria-label="에이전트별 필터"
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
          >
            <option value="all">전체 에이전트</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <select
            className="vulcan-input w-full lg:w-36"
            aria-label="우선순위별 필터"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
          >
            <option value="all">전체 우선순위</option>
            <option value="critical">긴급</option>
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid min-h-0 flex-1 gap-3 overflow-x-auto pb-2 lg:snap-x lg:snap-mandatory lg:grid-cols-3 xl:grid-cols-6">
          {LANES.map((lane) => {
            const laneTasks = filtered.filter((task) => task.lane === lane.key);
            return (
              <DroppableLane
                key={lane.key}
                lane={lane}
                tasks={laneTasks}
                agentMap={agentMap}
                count={laneCounts[lane.key]}
                onOpenDetail={handleOpenDetail}
                workOrdersByTaskId={workOrdersByTaskId}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCardOverlay
              task={activeTask}
              agent={agentMap.get(activeTask.assigneeAgentId ?? "")}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          agents={agents}
          onClose={() => setDetailTask(null)}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
        />
      )}

      {showCreateModal && (
        <TaskDetailModal
          task={null}
          agents={agents}
          onClose={() => setShowCreateModal(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </section>
  );
}
