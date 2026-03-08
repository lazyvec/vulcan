import { SkillsMarketplace } from "@/components/SkillsMarketplace";
import { getAgents, getSkills, getSkillRegistry } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const [skills, agents, registry] = await Promise.all([
    getSkills(),
    getAgents({ includeInactive: true }),
    getSkillRegistry(),
  ]);

  return (
    <SkillsMarketplace
      initialSkills={skills}
      initialAgents={agents}
      initialRegistry={registry}
    />
  );
}
