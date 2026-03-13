import { KnowledgeSearch } from "@/components/KnowledgeSearch";
import { getHermesMemoryStats } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  let stats = { total: 0, byLayer: {}, byType: {}, byLifecycle: {}, totalFileSize: 0 };
  try {
    stats = await getHermesMemoryStats();
  } catch {
    // API 미응답 시 빈 통계로 폴백
  }

  return <KnowledgeSearch initialStats={stats} />;
}
