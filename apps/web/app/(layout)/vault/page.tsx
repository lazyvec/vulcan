import { VaultExplorer } from "@/components/VaultExplorer";
import { getVaultNotes } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string }>;
}) {
  const [notes, params] = await Promise.all([getVaultNotes(), searchParams]);
  return <VaultExplorer initialNotes={notes} initialNotePath={params.note} />;
}
