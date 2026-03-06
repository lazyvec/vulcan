import { TeamControlBoard } from "@/components/TeamControlBoard";
import { getAgents } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const agents = await getAgents({ includeInactive: true });
  return <TeamControlBoard initialAgents={agents} />;
}
