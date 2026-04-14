import SEOHead from "@/components/SEOHead";
import { tc } from "@/lib/i18n-canonical";
import BuyerOrderTracker from "@/components/storefront/BuyerOrderTracker";
import BuyerDashboard from "@/components/storefront/BuyerDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useStorefrontRealtime } from "@/hooks/useStorefrontRealtime";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Receipt, Zap } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function MyOrdersPage() {
  useUiEngine("my-orders");
  const { user } = useAuth();
  const navigate = useNavigate();
  useStorefrontRealtime({ buyerId: user?.id });

  return (
    <>
      <SEOHead title={tc("nav.orders")} description={tc("commerce.track_order")} />
      <SubPageShell title={tc("nav.orders")} onBack={() => navigate("/home")} noContentPad>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pt-3 mb-4 grid grid-cols-3 gap-2"
        >
          <button
            onClick={() => navigate("/my-orders/active")}
            className="rounded-2xl p-3 text-center active:scale-95 transition-transform bg-blue-500/[0.06] border border-blue-500/10"
          >
            <Zap className="w-4 h-4 mx-auto mb-1 text-blue-500" />
            <p className="text-[10px] font-bold text-foreground">Active</p>
          </button>
          <button
            onClick={() => navigate("/me/order-receipts")}
            className="rounded-2xl p-3 text-center active:scale-95 transition-transform bg-emerald-600/[0.06] border border-emerald-600/10"
          >
            <Receipt className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
            <p className="text-[10px] font-bold text-foreground">Receipts</p>
          </button>
          <button
            onClick={() => navigate("/me/spending-insights")}
            className="rounded-2xl p-3 text-center active:scale-95 transition-transform bg-purple-500/[0.06] border border-purple-500/10"
          >
            <Package className="w-4 h-4 mx-auto mb-1 text-purple-500" />
            <p className="text-[10px] font-bold text-foreground">Insights</p>
          </button>
        </motion.div>

        <div className="px-4 space-y-4">
          <BuyerDashboard />
          <BuyerOrderTracker />
        </div>
      </SubPageShell>
    </>
  );
}
