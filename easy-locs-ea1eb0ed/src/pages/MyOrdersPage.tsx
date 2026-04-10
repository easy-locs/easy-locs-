import SEOHead from "@/components/SEOHead";
import { tc } from "@/lib/i18n-canonical";
import BuyerOrderTracker from "@/components/storefront/BuyerOrderTracker";
import BuyerDashboard from "@/components/storefront/BuyerDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useStorefrontRealtime } from "@/hooks/useStorefrontRealtime";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Package, Receipt, Zap } from "lucide-react";

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
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{tc("nav.orders")}</h1>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 mb-4 grid grid-cols-3 gap-2"
        >
          <button
            onClick={() => navigate("/my-orders/active")}
            className="rounded-2xl p-3 text-center active:scale-95 transition-transform"
            style={{ background: "hsl(210 80% 52% / 0.06)", border: "1px solid hsl(210 80% 52% / 0.1)" }}
          >
            <Zap className="w-4 h-4 mx-auto mb-1" style={{ color: "hsl(210 80% 52%)" }} />
            <p className="text-[10px] font-bold text-foreground">Active</p>
          </button>
          <button
            onClick={() => navigate("/me/order-receipts")}
            className="rounded-2xl p-3 text-center active:scale-95 transition-transform"
            style={{ background: "hsl(152 60% 42% / 0.06)", border: "1px solid hsl(152 60% 42% / 0.1)" }}
          >
            <Receipt className="w-4 h-4 mx-auto mb-1" style={{ color: "hsl(152 60% 42%)" }} />
            <p className="text-[10px] font-bold text-foreground">Receipts</p>
          </button>
          <button
            onClick={() => navigate("/me/spending-insights")}
            className="rounded-2xl p-3 text-center active:scale-95 transition-transform"
            style={{ background: "hsl(270 60% 55% / 0.06)", border: "1px solid hsl(270 60% 55% / 0.1)" }}
          >
            <Package className="w-4 h-4 mx-auto mb-1" style={{ color: "hsl(270 60% 55%)" }} />
            <p className="text-[10px] font-bold text-foreground">Insights</p>
          </button>
        </motion.div>

        <div className="flex-1 px-4 pb-24 space-y-4">
          <BuyerDashboard />
          <BuyerOrderTracker />
        </div>
      </div>
    </>
  );
}
