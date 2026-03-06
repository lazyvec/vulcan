import { NextRequest, NextResponse } from "next/server";
import { taskLanePatchSchema } from "@vulcan/shared/schemas";
import { publishEvent } from "@/lib/event-stream";
import { appendEvent, updateTaskLane } from "@/lib/store";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON payload" }, { status: 400 });
  }

  const parsed = taskLanePatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid task lane payload",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const task = updateTaskLane(id, parsed.data.lane);
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
