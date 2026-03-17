/**
 * MyBusinessHub — V7 Private business control center.
 * Central hub for: My Shops, Orders, POS, Wallet, Delivery, Customers.
 */
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import {
  Store, ShoppingBag, Scan, Wallet, Truck, Users,
  BarChart3, ChevronRight, Settings, Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { haptic } from "@/lib/haptics";

const MODULES = [
  { icon: Store, label: "My Shops", desc: "Manage your storefronts", path: "/business/my-shops", color: "hsl(var(--primary))" },
  { icon: ShoppingBag, label: "Orders", desc: "Track & manage orders", path: "/my-orders", color: "hsl(var(--accent))" },
  { icon: Scan, label: "POS", desc: "Point of sale terminal", path: "/pos", color: "#f59e0b" },
  { icon: Wallet, label: "Wallet & Finance", desc: "Transactions & balance", path: "/dashboard/wallet", color: "#10b981" },
  { icon: Truck, label: "Delivery", desc: "Dispatch & tracking", path: "/dashboard/driver", color: "#8b5cf6" },
  { icon: Users, label: "Customers", desc: "CRM & contacts", path: "/dashboard/communication", color: "#ec4899" },
  { icon: BarChart3, label: "Analytics", desc: "Sales & performance", path: "/dashboard/reporting", color: "#06b6d4" },
  { icon: Package, label: "Inventory", desc: "Stock management", path: "/dashboard/seller", color: "#f97316" },
  { icon: Settings, label: "Settings", desc: "Account & preferences", path: "/dashboard/settings", color: "hsl(var(--muted-foreground))" },
];

export default function MyBusinessHub() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <MobilePageHeader title="My Business" />

      <div className="px-4 pt-3 pb-4 space-y-2">
        {/* Welcome banner */}
        <div className="rounded-2xl p-4 mb-3" style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--accent) / 0.08))",
          border: "1px solid hsl(var(--primary) / 0.15)",
        }}>
          <p className="text-sm font-bold text-foreground">Control Center</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage all your business operations from one place.
          </p>
        </div>

        {/* Module grid */}
        <div className="space-y-2">
          {MODULES.map((mod) => (
            <button
              key={mod.path}
              onClick={() => { haptic("light"); navigate(mod.path); }}
              className="w-full text-left active:scale-[0.98] transition-all duration-150"
            >
              <Card className="hover:shadow-md transition-shadow border-border/40">
                <CardContent className="p-3.5 flex items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${mod.color}15`, color: mod.color }}
                  >
                    <mod.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{mod.label}</p>
                    <p className="text-xs text-muted-foreground">{mod.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
