import { VaultExplorer } from "@/components/VaultExplorer";
import { getVaultNotes } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const notes = await getVaultNotes();
  return <VaultExplorer initialNotes={notes} />;
}
