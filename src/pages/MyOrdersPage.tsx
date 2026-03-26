/**
 * MyOrdersPage — Customer order history with clean mobile layout.
 * Route: /my-orders
 */
import SEOHead from "@/components/SEOHead";
import { tc } from "@/lib/i18n-canonical";
import BuyerOrderTracker from "@/components/storefront/BuyerOrderTracker";
import BuyerDashboard from "@/components/storefront/BuyerDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useStorefrontRealtime } from "@/hooks/useStorefrontRealtime";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MyOrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useStorefrontRealtime({ buyerId: user?.id });

  return (
    <>
      <SEOHead title={tc("nav.orders")} description={tc("commerce.track_order")} />
      <div className="app-mobile-page flex flex-col bg-background" data-orders-page>
        <header className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={() => navigate("/home")}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: "hsl(var(--muted))" }}
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{tc("nav.orders")}</h1>
        </header>

        <div className="flex-1 px-4 pb-24 space-y-4">
          <BuyerDashboard />
          <BuyerOrderTracker />
        </div>
      </div>
    </>
  );
}
