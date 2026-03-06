import { NextRequest, NextResponse } from "next/server";
import { publishEvent } from "@/lib/event-stream";
import { appendEvent } from "@/lib/store";
import type { IngestEventInput } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { events?: IngestEventInput[] } &
    Partial<IngestEventInput>;

  const events = Array.isArray(body.events)
    ? body.events
    : body.type && body.summary
      ? [{
          type: body.type,
          summary: body.summary,
          source: body.source,
          agentId: body.agentId,
          projectId: body.projectId,
          taskId: body.taskId,
          payloadJson: body.payloadJson,
        }]
      : [];

  if (!events.length) {
    return NextResponse.json({ error: "events are required" }, { status: 400 });
  }

  const inserted = events.map((event) => {
    const row = appendEvent(event);
    publishEvent(row);
    return row;
  });

  return NextResponse.json({ ingested: inserted.length, events: inserted });
}
