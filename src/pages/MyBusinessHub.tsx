/**
 * MyBusinessHub — V7 Private business control center.
 * Route: /business
 * Premium futuristic design. Mobile-first. No clutter.
 */
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import {
  Store, ShoppingBag, Scan, Wallet, Truck, Users,
  BarChart3, ChevronRight, Settings, Package, Briefcase,
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { motion } from "framer-motion";

const MODULES = [
  { icon: Store, labelKey: "business.my_shops", descKey: "business.my_shops_desc", path: "/business/my-shops", gradient: "from-primary to-primary/60" },
  { icon: ShoppingBag, labelKey: "business.orders", descKey: "business.orders_desc", path: "/my-orders", gradient: "from-accent to-accent/60" },
  { icon: Scan, labelKey: "business.pos", descKey: "business.pos_desc", path: "/pos", gradient: "from-amber-500 to-amber-400" },
  { icon: Wallet, labelKey: "business.wallet", descKey: "business.wallet_desc", path: "/dashboard/wallet", gradient: "from-emerald-500 to-emerald-400" },
  { icon: Truck, labelKey: "business.delivery", descKey: "business.delivery_desc", path: "/dashboard/driver", gradient: "from-violet-500 to-violet-400" },
  { icon: Users, labelKey: "business.customers", descKey: "business.customers_desc", path: "/dashboard/communication", gradient: "from-pink-500 to-pink-400" },
  { icon: BarChart3, labelKey: "business.analytics", descKey: "business.analytics_desc", path: "/dashboard/reporting", gradient: "from-cyan-500 to-cyan-400" },
  { icon: Package, labelKey: "business.inventory", descKey: "business.inventory_desc", path: "/dashboard/seller", gradient: "from-orange-500 to-orange-400" },
  { icon: Settings, labelKey: "business.settings", descKey: "business.settings_desc", path: "/dashboard/settings", gradient: "from-muted-foreground to-muted-foreground/60" },
];

const FALLBACKS: Record<string, string> = {
  "business.hub_title": "My Business",
  "business.hub_subtitle": "Manage all your business operations.",
  "business.control_center": "Control Center",
  "business.my_shops": "My Shops",
  "business.my_shops_desc": "Manage your storefronts",
  "business.orders": "Orders",
  "business.orders_desc": "Track & manage orders",
  "business.pos": "POS Terminal",
  "business.pos_desc": "Point of sale",
  "business.wallet": "Wallet & Finance",
  "business.wallet_desc": "Transactions & balance",
  "business.delivery": "Delivery",
  "business.delivery_desc": "Dispatch & tracking",
  "business.customers": "Customers",
  "business.customers_desc": "CRM & contacts",
  "business.analytics": "Analytics",
  "business.analytics_desc": "Sales & performance",
  "business.inventory": "Inventory",
  "business.inventory_desc": "Stock management",
  "business.settings": "Settings",
  "business.settings_desc": "Account & preferences",
};

export default function MyBusinessHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();

  const tr = (key: string) => {
    const val = t(key);
    return val && val !== key ? val : FALLBACKS[key] || key.split(".").pop() || "";
  };

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-background">
      <MobilePageHeader title={tr("business.hub_title")} />

      <div className="px-4 pt-4 pb-6 space-y-4 max-w-lg mx-auto w-full">
        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.06))",
            border: "1px solid hsl(var(--primary) / 0.1)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">{tr("business.control_center")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{tr("business.hub_subtitle")}</p>
            </div>
          </div>
          {/* Subtle glow */}
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20" style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }} />
        </motion.div>

        {/* Module cards */}
        <div className="space-y-2.5">
          {MODULES.map((mod, i) => (
            <motion.button
              key={mod.path}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              onClick={() => { haptic("light"); navigate(mod.path); }}
              className="w-full text-left active:scale-[0.98] transition-transform duration-150"
            >
              <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/30 bg-card hover:bg-accent/5 transition-colors">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                  <mod.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{tr(mod.labelKey)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{tr(mod.descKey)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
