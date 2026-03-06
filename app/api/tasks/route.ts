import { NextRequest, NextResponse } from "next/server";
import { getTasks } from "@/lib/store";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const lane = request.nextUrl.searchParams.get("lane") ?? "all";
  const q = request.nextUrl.searchParams.get("q") ?? "";

  const tasks = getTasks({
    lane: lane as "all" | "backlog" | "in_progress" | "review",
    q,
  });

  return NextResponse.json({ tasks });
}
