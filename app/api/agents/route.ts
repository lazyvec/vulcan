import { NextResponse } from "next/server";
import { getAgents } from "@/lib/store";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ agents: getAgents() });
}
