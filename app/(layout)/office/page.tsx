import { OfficeView } from "@/components/OfficeView";
import { getAgents, getLatestEvents } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function OfficePage() {
  const agents = getAgents();
  const events = getLatestEvents(80);

  return <OfficeView agents={agents} initialEvents={events} />;
}
