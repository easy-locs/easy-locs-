/**
 * SellerDashboardPage — Full seller hub page with business management.
 */
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import SellerDashboard from "@/components/seller/SellerDashboard";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";

export default function SellerDashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-4">
          <MobilePageHeader title="Seller Hub" backTo="/dashboard" />
          <SellerDashboard />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
