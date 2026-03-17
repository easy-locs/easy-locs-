/**
 * MyOrdersPage — PASS136/137: Buyer orders with consistent header and empty state.
 * Route: /my-orders
 */
import SEOHead from "@/components/SEOHead";
import BuyerOrderTracker from "@/components/storefront/BuyerOrderTracker";
import BuyerDashboard from "@/components/storefront/BuyerDashboard";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { useAuth } from "@/contexts/AuthContext";
import { useStorefrontRealtime } from "@/hooks/useStorefrontRealtime";
import { ShoppingBag } from "lucide-react";

export default function MyOrdersPage() {
  const { user } = useAuth();

  // PASS123: Realtime order updates for buyer
  useStorefrontRealtime({ buyerId: user?.id });

  return (
    <>
      <SEOHead title="My Orders" description="Track your storefront orders in real time." />
      <div className="min-h-screen bg-background pb-20">
        <MobilePageHeader
          title="My Orders"
          icon={<ShoppingBag className="h-5 w-5 text-primary" />}
          backTo="/dashboard"
        />
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          {/* PASS115: Buyer dashboard with stats */}
          <BuyerDashboard />

          {/* Order tracker with timeline */}
          <BuyerOrderTracker />
        </div>
      </div>
    </>
  );
}
