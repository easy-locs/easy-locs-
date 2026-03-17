/**
 * MyOrdersPage — PASS115: Enhanced buyer hub with dashboard + order tracker.
 * Route: /my-orders
 */
import SEOHead from "@/components/SEOHead";
import BuyerOrderTracker from "@/components/storefront/BuyerOrderTracker";
import BuyerDashboard from "@/components/storefront/BuyerDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useStorefrontRealtime } from "@/hooks/useStorefrontRealtime";
import { ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

export default function MyOrdersPage() {
  const { user } = useAuth();

  // PASS123: Realtime order updates for buyer
  useStorefrontRealtime({ buyerId: user?.id });

  return (
    <>
      <SEOHead title="My Orders" description="Track your storefront orders in real time." />
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" /> My Orders
            </h1>
            <Link to="/discover" className="text-xs text-primary hover:underline">
              Discover shops
            </Link>
          </div>

          {/* PASS115: Buyer dashboard with stats */}
          <BuyerDashboard />

          {/* Order tracker with timeline */}
          <BuyerOrderTracker />
        </div>
      </div>
    </>
  );
}
