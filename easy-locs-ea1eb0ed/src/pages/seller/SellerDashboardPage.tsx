/**
 * SellerDashboardPage — Full seller hub page with business management.
 */
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import SellerDashboard from "@/components/seller/SellerDashboard";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { useI18n } from "@/lib/i18n";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function SellerDashboardPage() {
  useUiEngine("seller-sellerdashboardpage");
  const { t } = useI18n();
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-4">
          <MobilePageHeader title={t("seller.hub_title")} backTo="/dashboard" />
          <SellerDashboard />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
