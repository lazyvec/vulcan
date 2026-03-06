import { MemoryBoard } from "@/components/MemoryBoard";
import { getMemoryItems } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function MemoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const journal = getMemoryItems("journal");
  const longterm = getMemoryItems("longterm");

  return <MemoryBoard journal={journal} longterm={longterm} initialQuery={query} />;
}
