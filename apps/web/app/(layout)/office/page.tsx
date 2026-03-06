import { OfficeView } from "@/components/OfficeView";
import { getAgents, getLatestEvents } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export default async function OfficePage() {
  const [agents, events] = await Promise.all([getAgents(), getLatestEvents(80)]);

  return <OfficeView agents={agents} initialEvents={events} />;
}
