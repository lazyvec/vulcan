import { getMemoryItems, getHermesMemoryStats } from "@/lib/api-server";
import { MemoryPageClient } from "./client";

export const dynamic = "force-dynamic";

export default async function MemoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";

  const [journal, longterm, profile, lesson, knowledgeStats] = await Promise.all([
    getMemoryItems("journal"),
    getMemoryItems("longterm"),
    getMemoryItems("profile"),
    getMemoryItems("lesson"),
    getHermesMemoryStats().catch(() => ({
      total: 0,
      byLayer: {},
      byType: {},
      byLifecycle: {},
      totalFileSize: 0,
    })),
  ]);

  return (
    <MemoryPageClient
      journal={journal}
      longterm={longterm}
      profile={profile}
      lesson={lesson}
      initialQuery={query}
      knowledgeStats={knowledgeStats}
    />
  );
}
