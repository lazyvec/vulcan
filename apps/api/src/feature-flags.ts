import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface FeatureFlag {
  id: string;
  enabled: boolean;
  description: string;
  updatedAt: number;
}

const FLAGS_PATH = join(import.meta.dirname ?? __dirname, "..", "data", "feature-flags.json");

const flags = new Map<string, FeatureFlag>();

function loadFlags(): void {
  flags.clear();
  if (!existsSync(FLAGS_PATH)) {
    return;
  }
  try {
    const raw = readFileSync(FLAGS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, FeatureFlag>;
    for (const [key, value] of Object.entries(parsed)) {
      flags.set(key, value);
    }
  } catch (error) {
    console.error("[feature-flags] 플래그 로드 실패:", error);
  }
}

function persistFlags(): void {
  const obj: Record<string, FeatureFlag> = {};
  for (const [key, value] of flags) {
    obj[key] = value;
  }
  try {
    writeFileSync(FLAGS_PATH, JSON.stringify(obj, null, 2) + "\n", "utf-8");
  } catch (error) {
    console.error("[feature-flags] 플래그 저장 실패:", error);
  }
}

// 앱 시작 시 로드
loadFlags();

export function isFeatureEnabled(id: string): boolean {
  return flags.get(id)?.enabled ?? false;
}

export function getFeatureFlag(id: string): FeatureFlag | undefined {
  return flags.get(id);
}

export function getAllFeatureFlags(): FeatureFlag[] {
  return [...flags.values()];
}

export function updateFeatureFlag(
  id: string,
  update: { enabled?: boolean; description?: string },
): FeatureFlag | null {
  const existing = flags.get(id);
  if (!existing) {
    return null;
  }
  const updated: FeatureFlag = {
    ...existing,
    ...(update.enabled !== undefined && { enabled: update.enabled }),
    ...(update.description !== undefined && { description: update.description }),
    updatedAt: Date.now(),
  };
  flags.set(id, updated);
  persistFlags();
  return updated;
}
