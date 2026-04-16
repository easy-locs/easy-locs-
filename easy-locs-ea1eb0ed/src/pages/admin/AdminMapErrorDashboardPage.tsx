import SubPageShell from "@/components/layout/SubPageShell";
import { useNavigate } from "react-router-dom";
import MapErrorDashboardWidget from "@/components/admin/MapErrorDashboardWidget";

export default function AdminMapErrorDashboardPage() {
  const navigate = useNavigate();

  return (
    <SubPageShell
      title="Map Error Dashboard"
      subtitle="Monitor map error rates, trends, and alert history"
      onBack={() => navigate("/admin/system-health")}
    >
      <MapErrorDashboardWidget />
    </SubPageShell>
  );
}
