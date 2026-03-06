import { MemoryBoard } from "@/components/MemoryBoard";
import { getMemoryItems } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export default async function MemoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const [journal, longterm] = await Promise.all([
    getMemoryItems("journal"),
    getMemoryItems("longterm"),
  ]);

  return <MemoryBoard journal={journal} longterm={longterm} initialQuery={query} />;
}
