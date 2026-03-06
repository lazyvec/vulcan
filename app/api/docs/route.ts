import { NextRequest, NextResponse } from "next/server";
import { getDocs } from "@/lib/store";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json({ docs: getDocs(q) });
}
