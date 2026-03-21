/**
 * POS Page — Seller kitchen/order queue for a specific shop.
 * Route: /pos/:shopId
 */
import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import KitchenQueue from "@/components/pos/KitchenQueue";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";

export default function PosPage() {
  const { shopId } = useParams<{ shopId: string }>();

  if (!shopId) return null;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-4">
          <MobilePageHeader title="Kitchen / POS" backTo="/dashboard/seller" />
          <KitchenQueue shopId={shopId} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
