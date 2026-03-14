import { getWorkOrders } from "@/lib/api-server";
import { WorkOrderDashboard } from "@/components/WorkOrderDashboard";

export const dynamic = "force-dynamic";

export default async function WorkOrdersPage() {
  const { workOrders, stats } = await getWorkOrders();

  return (
    <WorkOrderDashboard
      workOrders={workOrders}
      stats={stats}
    />
  );
}
