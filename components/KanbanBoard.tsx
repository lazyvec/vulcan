"use client";

import { useMemo, useState } from "react";
import type { Agent, Task, TaskLane } from "@/lib/types";

const LANES: Array<{ key: TaskLane; label: string }> = [
  { key: "backlog", label: "Backlog" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
];

interface KanbanBoardProps {
  initialTasks: Task[];
  agents: Agent[];
  initialQuery?: string;
}

function laneLabel(lane: TaskLane) {
  return LANES.find((item) => item.key === lane)?.label ?? lane;
}

export function KanbanBoard({ initialTasks, agents, initialQuery = "" }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [query, setQuery] = useState(initialQuery);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

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

  async function moveTask(taskId: string, lane: TaskLane) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lane }),
    });

    if (!response.ok) {
      return;
    }

    const { task } = (await response.json()) as { task: Task };
    setTasks((prev) => prev.map((item) => (item.id === task.id ? task : item)));
  }

  return (
    <section className="vulcan-card flex h-full flex-col p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-semibold text-[var(--color-foreground)]">Tasks Kanban</h2>
        <input
          className="vulcan-input w-52"
          placeholder="Task 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="vulcan-input w-48"
          value={assigneeFilter}
          onChange={(event) => setAssigneeFilter(event.target.value)}
        >
          <option value="all">모든 담당자</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid flex-1 gap-3 md:grid-cols-3">
        {LANES.map((lane) => {
          const laneTasks = filtered.filter((task) => task.lane === lane.key);
          return (
            <div
              key={lane.key}
              className="rounded-[var(--radius-card)] border p-3"
              style={{ borderColor: "var(--color-border)", background: "rgba(28,25,23,0.68)" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--color-foreground)]">{lane.label}</h3>
                <span className="vulcan-chip">{laneTasks.length}</span>
              </div>

              <div className="space-y-2">
                {laneTasks.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-[var(--radius-control)] border p-3"
                    style={{ borderColor: "var(--color-border)", background: "rgba(41,37,36,0.45)" }}
                  >
                    <p className="text-sm font-medium text-[var(--color-foreground)]">{task.title}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      {task.assigneeAgentId ?? "unassigned"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {LANES.filter((target) => target.key !== task.lane).map((target) => (
                        <button
                          key={target.key}
                          className="rounded-[var(--radius-control)] border px-2 py-1 text-xs"
                          style={{ borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}
                          onClick={() => moveTask(task.id, target.key)}
                          type="button"
                        >
                          → {laneLabel(target.key)}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}

                {laneTasks.length === 0 ? (
                  <p className="text-xs text-[var(--color-tertiary)]">이 컬럼에는 태스크가 없습니다.</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
