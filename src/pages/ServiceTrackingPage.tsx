/**
 * ServiceTrackingPage — Dashboard page for live service tracking.
 * PASS55 Block G
 */
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import TrackingDashboard from "@/components/tracking/TrackingDashboard";

export default function ServiceTrackingPage() {
  return (
    <DashboardLayout>
      <TrackingDashboard />
    </DashboardLayout>
  );
}
