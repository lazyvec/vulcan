import { NextResponse } from "next/server";
import { getSchedules } from "@/lib/store";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ schedules: getSchedules() });
}
