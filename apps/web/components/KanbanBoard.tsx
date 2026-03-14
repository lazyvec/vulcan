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
import { motion, AnimatePresence } from "framer-motion";
import { useMounted } from "@/hooks/useMounted";

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
    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-glass-border bg-[var(--color-muted)] text-[10px] font-black text-[var(--color-muted-foreground)] shadow-inner">
      {initials}
    </div>
  );
}

function laneIcon(lane: TaskLane) {
  switch (lane) {
    case "backlog": return <Inbox size={14} className="text-[var(--color-tertiary)]" />;
    case "queued": return <CircleDashed size={14} className="text-[var(--color-tertiary)]" />;
    case "in_progress": return <Clock3 size={14} className="text-[var(--color-primary)]" />;
    case "review": return <Eye size={14} className="text-[var(--color-info)]" />;
    case "done": return <CheckCircle2 size={14} className="text-[var(--color-success)]" />;
    case "archived": return <Archive size={14} className="text-[var(--color-tertiary)]" />;
  }
}

function priorityIcon(priority: TaskPriority) {
  switch (priority) {
    case "critical": return <Flame size={12} className="text-[var(--color-destructive)]" />;
    case "high": return <AlertTriangle size={12} className="text-[var(--color-primary)]" />;
    case "medium": return <ArrowUp size={12} className="text-[var(--color-warning)]" />;
    case "low": return <ArrowDown size={12} className="text-[var(--color-tertiary)]" />;
  }
}

const priorityLabels: Record<TaskPriority, string> = {
  critical: "긴급",
  high: "높음",
  medium: "보통",
  low: "낮음",
};

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
    <div className="flex items-center gap-1.5 rounded-md border border-glass-border bg-[var(--color-background)]/40 px-2 py-1 shadow-inner">
      <span
        className={`h-1.5 w-1.5 rounded-full ${workOrder.status === 'in_progress' ? 'animate-pulse' : ''}`}
        style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
      />
      <span className="text-[9px] font-bold uppercase tracking-tighter text-[var(--color-muted-foreground)]">
        {workOrder.status}
      </span>
      <span className="text-[9px] font-medium text-[var(--color-tertiary)]">
        {workOrder.fromAgentId}⇢{workOrder.toAgentId}
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
    opacity: isDragging ? 0.3 : 1,
  };

  const isActive = task.lane === "in_progress";

  return (
    <motion.article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      whileHover={{ y: -2, scale: 1.01 }}
      className={`cursor-grab rounded-xl border border-glass-border bg-[var(--color-surface)] p-3.5 shadow-sm transition-all active:cursor-grabbing hover:border-glass-border hover:shadow-md ${isActive ? 'ring-1 ring-[var(--color-primary)]/20 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-primary-bg)]' : ''}`}
    >
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-sm font-bold tracking-tight text-[var(--color-foreground)]">
          {task.title}
        </p>
        <Avatar agent={agent} />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 rounded-md bg-[var(--color-background)]/50 px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-tertiary)] border border-glass-border">
          {priorityIcon(task.priority)}
          {priorityLabels[task.priority]}
        </span>
        {task.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="vulcan-chip border-glass-border text-[9px] font-black uppercase tracking-widest opacity-80">
            {tag}
          </span>
        ))}
      </div>
      {workOrder && (
        <div className="mb-3">
          <WorkOrderBadge workOrder={workOrder} />
        </div>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-glass-border pt-2.5 mt-1">
        <p className="truncate text-[10px] font-medium text-[var(--color-tertiary)] uppercase tracking-tighter">
          ID: {task.id.split("-")[0]} · {formatUpdatedAt(task.updatedAt)}
        </p>
        <button
          type="button"
          className="rounded-md border border-glass-border bg-[var(--color-background)] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] hover:bg-[var(--color-primary)] hover:text-white transition-all shadow-inner"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onOpenDetail(task)}
        >
          View
        </button>
      </div>
    </motion.article>
  );
}

function TaskCardOverlay({ task, agent }: { task: Task; agent?: Agent }) {
  return (
    <article className="w-[280px] rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-surface)] p-4 shadow-2xl rotate-2">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-bold text-[var(--color-foreground)]">
          {task.title}
        </p>
        <Avatar agent={agent} />
      </div>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--color-tertiary)] uppercase">
          {priorityIcon(task.priority)}
          {priorityLabels[task.priority]}
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
    <div className="flex flex-col rounded-2xl border border-glass-border bg-[var(--color-background)]/40 p-2.5 lg:min-w-[240px] lg:snap-center transition-colors hover:bg-[var(--color-background)]/60">
      <div className="mb-4 flex items-center justify-between rounded-xl border border-glass-border bg-[var(--color-surface)]/80 backdrop-blur-sm px-3 py-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-background)] shadow-inner">
            {laneIcon(lane.key)}
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-foreground)]">{lane.label}</h3>
            <p className="text-[9px] font-bold uppercase tracking-tighter text-[var(--color-tertiary)] opacity-60">{lane.note}</p>
          </div>
        </div>
        <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[var(--color-muted)] px-1.5 text-[10px] font-black border border-glass-border shadow-inner">{count}</span>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 overflow-y-auto p-1 custom-scrollbar min-h-[150px]" data-lane={lane.key}>
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
            <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-glass-border bg-white/[0.01]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-tertiary)] opacity-30">
                Empty Lane
              </p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({ initialTasks, agents, initialQuery = "", workOrdersByTaskId = {} }: KanbanBoardProps) {
  const mounted = useMounted();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [query, setQuery] = useState(initialQuery);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const agentMap = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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
          method: "PATCH",
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

  return (
    <section className="flex h-full min-h-0 flex-col rounded-3xl border border-glass-border bg-[var(--color-surface)] p-5 shadow-2xl overflow-hidden">
      {/* Controls Container */}
      <div className="mb-6 rounded-2xl border border-glass-border bg-[var(--color-background)]/50 p-4 shadow-inner backdrop-blur-md">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-auto">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-bg)] text-[var(--color-primary)] shadow-sm">
              <ListChecks size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-[var(--color-foreground)]">태스크 보드</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-tertiary)] opacity-60">Operations Flow</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="vulcan-chip border-glass-border shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-foreground)] opacity-40" />
              TOTAL {filtered.length}
            </span>
            <button
              type="button"
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-1 text-sm font-black uppercase tracking-widest text-white hover:bg-[var(--color-primary-hover)] transition-all shadow-lg active:scale-95"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} strokeWidth={3} />
              NEW TASK
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1 group">
            <input
              className="vulcan-input w-full min-h-[48px] pl-11 bg-[var(--color-background)] focus:bg-[var(--color-surface)] border-glass-border"
              placeholder="제목, 설명 또는 ID로 검색..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Plus size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-tertiary)] rotate-45 group-focus-within:text-[var(--color-primary)] transition-colors" />
          </div>
          <div className="flex gap-3">
            <select
              className="vulcan-input min-h-[48px] lg:w-48 bg-[var(--color-background)] border-glass-border font-bold text-[11px] uppercase tracking-widest"
              aria-label="에이전트별 필터"
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
            >
              <option value="all">ALL AGENTS</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name.toUpperCase()}</option>
              ))}
            </select>
            <select
              className="vulcan-input min-h-[48px] lg:w-44 bg-[var(--color-background)] border-glass-border font-bold text-[11px] uppercase tracking-widest"
              aria-label="우선순위별 필터"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
            >
              <option value="all">PRIORITY: ALL</option>
              <option value="critical">CRITICAL</option>
              <option value="high">HIGH</option>
              <option value="medium">MEDIUM</option>
              <option value="low">LOW</option>
            </select>
          </div>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 min-h-0 flex-1 gap-4 overflow-x-auto pb-4 px-1 lg:snap-x lg:snap-mandatory lg:grid-cols-3 xl:grid-cols-6 custom-scrollbar">
          {LANES.map((lane) => {
            const laneTasks = filtered.filter((task) => task.lane === lane.key);
            return (
              <DroppableLane
                key={lane.key}
                lane={lane}
                tasks={laneTasks}
                agentMap={agentMap}
                count={laneCounts[lane.key]}
                onOpenDetail={(t) => setDetailTask(t)}
                workOrdersByTaskId={workOrdersByTaskId}
              />
            );
          })}
        </div>

        <DragOverlay dropAnimation={{ duration: 300, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
          {activeTask ? (
            <TaskCardOverlay
              task={activeTask}
              agent={agentMap.get(activeTask.assigneeAgentId ?? "")}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals with AnimatePresence handled inside the component */}
      <AnimatePresence>
        {mounted && (detailTask || showCreateModal) && (
          <TaskDetailModal
            task={detailTask}
            agents={agents}
            onClose={() => { setDetailTask(null); setShowCreateModal(false); }}
            onTaskUpdated={(updated) => {
              setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
              setDetailTask(updated);
            }}
            onTaskCreated={(created) => {
              setTasks((prev) => [created, ...prev]);
              setShowCreateModal(false);
            }}
            onTaskDeleted={(taskId) => {
              setTasks((prev) => prev.filter((t) => t.id !== taskId));
              setDetailTask(null);
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
