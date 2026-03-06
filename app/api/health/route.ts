import { NextResponse } from "next/server";
import { ensureSchema, getSqlite } from "@/lib/db";
import { getSubscriberCount } from "@/lib/event-stream";
import { getRuntimeInfo } from "@/lib/runtimeInfo";
import { countRecords } from "@/lib/store";

export const runtime = "nodejs";

export function GET() {
  const runtime = getRuntimeInfo();

  let dbOk = true;
  let dbError: string | undefined;

  try {
    ensureSchema();
    getSqlite().prepare("SELECT 1").get();
  } catch (error) {
    dbOk = false;
    dbError = error instanceof Error ? error.message : String(error);
  }

  const payload = {
    ok: dbOk,
    build: runtime.build,
    gitSha: runtime.gitSha,
    uptimeMs: runtime.uptimeMs,
    dbOk,
    sseOk: true,
    sseSubscribers: getSubscriberCount(),
    records: countRecords(),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    port: process.env.PORT ?? "3001",
    dbError,
  };

  return NextResponse.json(payload, {
    status: dbOk ? 200 : 503,
  });
}
