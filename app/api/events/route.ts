import { NextRequest, NextResponse } from "next/server";
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
  const body = (await request.json()) as {
    source?: string;
    type?: string;
    summary?: string;
    agentId?: string | null;
    projectId?: string | null;
    taskId?: string | null;
    payloadJson?: string;
  };

  if (!body.type || !body.summary) {
    return NextResponse.json({ error: "type and summary are required" }, { status: 400 });
  }

  const event = appendEvent({
    source: body.source,
    type: body.type,
    summary: body.summary,
    agentId: body.agentId ?? null,
    projectId: body.projectId ?? null,
    taskId: body.taskId ?? null,
    payloadJson: body.payloadJson,
  });

  publishEvent(event);

  return NextResponse.json({ event });
}
