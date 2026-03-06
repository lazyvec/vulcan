import { NextRequest, NextResponse } from "next/server";
import { getMemoryItems } from "@/lib/store";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const container = request.nextUrl.searchParams.get("container") as
    | "journal"
    | "longterm"
    | null;
  return NextResponse.json({ memory: getMemoryItems(container ?? undefined) });
}
