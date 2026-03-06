import { NextRequest, NextResponse } from "next/server";
import { createEventSchema } from "@vulcan/shared/schemas";
import { publishEvent } from "@/lib/event-stream";
import { appendEvent, getEventsSince, getLatestEvents } from "@/lib/store";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const since = Number(request.nextUrl.searchParams.get("since") ?? "0");

  if (Number.isFinite(since) && since > 0) {
    return NextResponse.json({ events: getEventsSince(since) });
  }

  return NextResponse.json({ events: getLatestEvents(80) });
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON payload" }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid event payload",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const event = appendEvent({
    source: parsed.data.source,
    type: parsed.data.type,
    summary: parsed.data.summary,
    agentId: parsed.data.agentId ?? null,
    projectId: parsed.data.projectId ?? null,
    taskId: parsed.data.taskId ?? null,
    payloadJson: parsed.data.payloadJson,
  });

  publishEvent(event);

  return NextResponse.json({ event });
}
