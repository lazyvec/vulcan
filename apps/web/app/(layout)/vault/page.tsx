import { getVaultNotes, getDocs } from "@/lib/api-server";
import { VaultPageClient } from "./client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string; tab?: string; q?: string }>;
}) {
  const params = await searchParams;
  const docsQuery = params.q ?? "";
  const [notes, docs] = await Promise.all([
    getVaultNotes(),
    getDocs(docsQuery),
  ]);
  return (
    <VaultPageClient
      initialNotes={notes}
      initialNotePath={params.note}
      docs={docs}
      docsQuery={docsQuery}
    />
  );
}
