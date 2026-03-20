import { AppPageShell } from "@/components/layout/AppPageShell";
import { TenantDashboard } from "@/components/property/TenantDashboard";

export default function TenantDashboardPage() {
  return (
    <AppPageShell title="Tenant Dashboard">
      <TenantDashboard tenantOrbitId="orbit_tenant_demo_1" />
    </AppPageShell>
  );
}
