import { getWorkOrders, getWorkflowTemplates, getActiveWorkflows } from "@/lib/api-server";
import { WorkOrderDashboard } from "@/components/WorkOrderDashboard";

export const dynamic = "force-dynamic";

export default async function WorkOrdersPage() {
  const [{ workOrders, stats }, templates] = await Promise.all([
    getWorkOrders(),
    getWorkflowTemplates(),
  ]);

  const activeWorkflows = await getActiveWorkflows(workOrders);

  return (
    <WorkOrderDashboard
      workOrders={workOrders}
      stats={stats}
      workflowTemplates={templates}
      activeWorkflows={activeWorkflows}
    />
  );
}
