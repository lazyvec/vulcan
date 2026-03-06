import { NextResponse } from "next/server";
import { getProjects } from "@/lib/store";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ projects: getProjects() });
}
