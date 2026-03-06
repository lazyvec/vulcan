import { NextRequest, NextResponse } from "next/server";
import { publishEvent } from "@/lib/event-stream";
import { appendEvent, updateTaskLane } from "@/lib/store";
import type { TaskLane } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as { lane?: TaskLane };

  if (!body.lane) {
    return NextResponse.json({ error: "lane is required" }, { status: 400 });
  }

  const task = updateTaskLane(id, body.lane);
  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  const event = appendEvent({
    source: "vulcan",
    type: "task_move",
    summary: `${task.id} moved to ${task.lane}`,
    taskId: task.id,
    projectId: task.projectId,
    agentId: task.assigneeAgentId,
    payloadJson: JSON.stringify({ lane: task.lane }),
  });

  publishEvent(event);

  return NextResponse.json({ task });
}
