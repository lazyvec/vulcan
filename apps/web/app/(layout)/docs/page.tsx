import { DocsExplorer } from "@/components/DocsExplorer";
import { getDocs } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export default async function DocsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const docs = await getDocs(query);
  return <DocsExplorer docs={docs} initialQuery={query} />;
}
