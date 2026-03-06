"use client";

import { useMemo, useState } from "react";
import type { Agent, Task, TaskLane } from "@/lib/types";
import { CheckCircle2, CircleDashed, Clock3 } from "lucide-react";

const LANES: Array<{ key: TaskLane; label: string; note: string }> = [
  { key: "backlog", label: "Backlog", note: "정리 대기" },
  { key: "in_progress", label: "In Progress", note: "실행 중" },
  { key: "review", label: "Review", note: "검토 대기" },
];

interface KanbanBoardProps {
  initialTasks: Task[];
  agents: Agent[];
  initialQuery?: string;
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
  if (lane === "in_progress") {
    return <Clock3 size={14} className="text-[var(--color-primary)]" />;
  }
  if (lane === "review") {
    return <CheckCircle2 size={14} className="text-blue-300" />;
  }
  return <CircleDashed size={14} className="text-[var(--color-tertiary)]" />;
}

function formatUpdatedAt(ts: number) {
  return new Date(ts).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function KanbanBoard({ initialTasks, agents, initialQuery = "" }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [query, setQuery] = useState(initialQuery);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);

  const agentMap = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const queryMatch =
        !normalized ||
        task.title.toLowerCase().includes(normalized) ||
        task.id.toLowerCase().includes(normalized);
      const assigneeMatch =
        assigneeFilter === "all" || task.assigneeAgentId === assigneeFilter;
      return queryMatch && assigneeMatch;
    });
  }, [assigneeFilter, query, tasks]);

  const laneCounts = useMemo(
    () =>
      Object.fromEntries(
        LANES.map((lane) => [lane.key, filtered.filter((task) => task.lane === lane.key).length]),
      ) as Record<TaskLane, number>,
    [filtered],
  );

  async function moveTask(taskId: string, lane: TaskLane) {
    let snapshot: Task[] = [];
    setMovingTaskId(taskId);
    setTasks((prev) => {
      snapshot = prev;
      return prev.map((task) => (task.id === taskId ? { ...task, lane } : task));
    });
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lane }),
      });
      if (!response.ok) {
        throw new Error("failed to move task");
      }
    } catch {
      setTasks(snapshot);
    } finally {
      setMovingTaskId(null);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/70 p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-lg font-semibold text-[var(--color-foreground)]">Task Board</h2>
          <span className="vulcan-chip text-xs">Total {filtered.length}</span>
          <span className="vulcan-chip text-xs">Agents {agents.length}</span>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row">
          <input
            className="vulcan-input w-full lg:max-w-sm"
            placeholder="Search tasks by title or id..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            className="vulcan-input w-full lg:w-56"
            aria-label="Filter by agent"
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
          >
            <option value="all">All Agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-x-auto pb-2 md:grid-cols-3">
        {LANES.map((lane) => {
          const laneTasks = filtered.filter((task) => task.lane === lane.key);
          return (
            <div
              key={lane.key}
              className="flex min-w-[285px] flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/75 p-2 md:min-w-0"
            >
              <div className="mb-3 flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2">
                <div className="flex items-center gap-1.5">
                  {laneIcon(lane.key)}
                  <div>
                    <h3 className="font-semibold text-[var(--color-foreground)]">{lane.label}</h3>
                    <p className="text-[11px] text-[var(--color-tertiary)]">{lane.note}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  {laneCounts[lane.key]}
                </span>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-1">
                {laneTasks.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm transition-colors hover:bg-[var(--color-muted)]/45"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium text-[var(--color-foreground)]">{task.title}</p>
                      <Avatar agent={agentMap.get(task.assigneeAgentId ?? "")} />
                    </div>
                    <p className="mb-2 text-xs text-[var(--color-tertiary)]">
                      #{task.id.split("-")[0]} · Updated {formatUpdatedAt(task.updatedAt)}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                        {agentMap.get(task.assigneeAgentId ?? "")?.name ?? "Unassigned"}
                      </p>
                      <div className="flex items-center gap-2">
                        <label className="sr-only" htmlFor={`lane-${task.id}`}>
                          Move task lane
                        </label>
                        <select
                          id={`lane-${task.id}`}
                          className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs text-[var(--color-muted-foreground)]"
                          value={task.lane}
                          onChange={(event) => {
                            const nextLane = event.target.value as TaskLane;
                            if (nextLane !== task.lane) {
                              void moveTask(task.id, nextLane);
                            }
                          }}
                          disabled={movingTaskId === task.id}
                        >
                          {LANES.map((target) => (
                            <option key={target.key} value={target.key}>
                              {target.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </article>
                ))}
                {laneTasks.length === 0 ? (
                  <div className="flex h-full min-h-[88px] items-center justify-center rounded border border-dashed border-[var(--color-border)]">
                    <p className="text-sm text-[var(--color-tertiary)]">No tasks in this lane.</p>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
