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
  Store, ShoppingBag, CreditCard, Wallet, Truck, Users,
  BarChart3, Settings, Boxes, Briefcase,
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { motion } from "framer-motion";

const FALLBACKS: Record<string, string> = {
  "business.hub_title": "My Business",
  "business.hub_subtitle": "Manage all your business operations.",
  "business.control_center": "Control Center",
  "business.my_shops": "My Shops",
  "business.my_shops_desc": "Manage your storefronts",
  "business.orders": "Orders",
  "business.orders_desc": "Track and manage orders",
  "business.pos": "POS Terminal",
  "business.pos_desc": "Point of sale",
  "business.wallet": "Wallet & Finance",
  "business.wallet_desc": "Transactions and balance",
  "business.delivery": "Delivery",
  "business.delivery_desc": "Dispatch and tracking",
  "business.customers": "Customers",
  "business.customers_desc": "CRM and contacts",
  "business.analytics": "Analytics",
  "business.analytics_desc": "Sales and performance",
  "business.inventory": "Inventory",
  "business.inventory_desc": "Stock management",
  "business.settings": "Settings",
  "business.settings_desc": "Account and preferences",
};

const MODULES = [
  { icon: Store, labelKey: "business.my_shops", descKey: "business.my_shops_desc", path: "/business/my-shops", gradient: "from-violet-500 to-fuchsia-500" },
  { icon: ShoppingBag, labelKey: "business.orders", descKey: "business.orders_desc", path: "/my-orders", gradient: "from-blue-500 to-cyan-500" },
  { icon: CreditCard, labelKey: "business.pos", descKey: "business.pos_desc", path: "/pos", gradient: "from-amber-500 to-orange-500" },
  { icon: Wallet, labelKey: "business.wallet", descKey: "business.wallet_desc", path: "/dashboard/wallet", gradient: "from-emerald-500 to-green-500" },
  { icon: Truck, labelKey: "business.delivery", descKey: "business.delivery_desc", path: "/dashboard/driver", gradient: "from-sky-500 to-indigo-500" },
  { icon: Users, labelKey: "business.customers", descKey: "business.customers_desc", path: "/dashboard/communication", gradient: "from-pink-500 to-rose-500" },
  { icon: BarChart3, labelKey: "business.analytics", descKey: "business.analytics_desc", path: "/dashboard/reporting", gradient: "from-teal-500 to-cyan-500" },
  { icon: Boxes, labelKey: "business.inventory", descKey: "business.inventory_desc", path: "/dashboard/ops", gradient: "from-lime-500 to-emerald-500" },
  { icon: Settings, labelKey: "business.settings", descKey: "business.settings_desc", path: "/dashboard/seller", gradient: "from-slate-500 to-zinc-500" },
];

export default function MyBusinessHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();

  const tr = (key: string) => {
    const val = t(key);
    return val && val !== key ? val : FALLBACKS[key] || key.split(".").pop() || "";
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-background">
      <MobilePageHeader title={tr("business.hub_title")} />

      <div className="px-4 pt-4 pb-6 space-y-4 max-w-lg mx-auto w-full">
        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl p-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.06))",
            border: "1px solid hsl(var(--primary) / 0.1)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{tr("business.control_center")}</p>
              <p className="text-base font-semibold text-foreground/80 mt-0.5">{tr("business.hub_title")}</p>
              <p className="text-xs text-muted-foreground mt-1">{tr("business.hub_subtitle")}</p>
            </div>
          </div>
          {/* Subtle glow */}
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20" style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }} />
        </motion.div>

        {/* Module cards */}
        <div className="space-y-3">
          {MODULES.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.button
                key={mod.path}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                onClick={() => { haptic("light"); navigate(mod.path); }}
                className="w-full rounded-3xl border border-border/50 bg-card p-5 text-left shadow-sm transition-transform duration-150 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{tr(mod.labelKey)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{tr(mod.descKey)}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
