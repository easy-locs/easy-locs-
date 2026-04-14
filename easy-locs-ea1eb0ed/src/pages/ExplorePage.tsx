import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ExploreScreen from "@/domains/explore/ExploreScreen";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function ExplorePage() {
  useUiEngine("explorepage");
  return (
    <DashboardLayout>
      <ExploreScreen />
    </DashboardLayout>
  );
}
