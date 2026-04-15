/**
 * CustomerProfilePage — Smart personal hub ("Me" page).
 * Fully connected, clean hierarchy, premium UX.
 */
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { SettingsSectionCard } from "@/components/settings/SettingsSectionCard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { StatusPulse } from "@/components/ui/StatusPulse";
import {
  Store, ShoppingBag, QrCode, Receipt, BarChart3,
  Wallet, Landmark, CreditCard,
  Building2, KeyRound, Users,
  MessageSquare, Bell, HelpCircle,
  User, Shield, LogOut,
  Heart, Star, Truck, DollarSign,
  Settings, MapPin, Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function CustomerProfilePage() {
  useUiEngine("customerprofilepage");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const profile = useOrbitIdentity();

  const initials = (profile?.displayName || "U")
    .split(/[\s@]/)
    .map((w) => w[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/login");
  };

  return (
    <SubPageShell>
      <div className="max-w-md mx-auto px-4 py-5 pb-[calc(90px+env(safe-area-inset-bottom,0px))] space-y-3">
      {/* ── Profile Identity Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/15 bg-card p-4 flex items-center gap-3.5"
      >
        <Avatar className="h-14 w-14 rounded-2xl border-2 border-accent/30">
          <AvatarImage src={profile?.avatarUrl || undefined} alt={profile?.displayName || "User"} className="rounded-2xl" />
          <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg rounded-2xl">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-foreground break-words leading-snug">
              {profile?.displayName || "User"}
            </p>
            <StatusPulse status="active" size="sm" />
          </div>
          <p className="text-[11px] text-muted-foreground break-words leading-snug font-mono">EL-{(user?.id || "").replace(/-/g, "").substring(0, 8).toUpperCase()}</p>
          {profile?.role && (
            <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-px rounded-full bg-accent/15 text-accent">
              {profile.role}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate("/settings/account")}
          className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </motion.div>

      {/* ── Quick Actions Strip ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-4 gap-2"
      >
        {[
          { icon: Wallet, label: "Wallet", path: "/wallet", color: "text-emerald-500" },
          { icon: ShoppingBag, label: "Orders", path: "/my-orders", color: "text-blue-500" },
          { icon: Heart, label: "Favorites", path: "/favorites", color: "text-red-500" },
          { icon: HelpCircle, label: "Support", path: "/support/tickets", color: "text-amber-500" },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border/15 active:scale-[0.96] transition-transform"
          >
            <action.icon className={`w-5 h-5 ${action.color}`} />
            <span className="text-[10px] font-semibold text-foreground">{action.label}</span>
          </button>
        ))}
      </motion.div>

      {/* ── 1. Seller Hub ── */}
      <SettingsSectionCard
        title="Seller Hub"
        items={[
          { label: "My Shops", path: "/dashboard/my-shops", icon: Store, subtitle: "Manage stores & catalog" },
          { label: "Sales Dashboard", path: "/seller", icon: BarChart3 },
          { label: "Merchant Orders", path: "/merchant/orders", icon: ShoppingBag },
          { label: "Merchant Finance", path: "/merchant/finance", icon: DollarSign, subtitle: "Payments & ledger" },
        ]}
      />

      {/* ── 2. Orders ── */}
      <SettingsSectionCard
        title="Orders"
        items={[
          { label: "My Orders", path: "/my-orders", icon: Receipt, subtitle: "Track & manage" },
          { label: "POS Terminal", path: "/merchant/pos", icon: QrCode },
          { label: "Delivery Tracking", path: "/tracking/latest", icon: Truck },
        ]}
      />

      {/* ── 3. Wallet ── */}
      <SettingsSectionCard
        title="Wallet"
        items={[
          { label: "Wallet", path: "/wallet", icon: Wallet, subtitle: "Balance & analytics" },
          { label: "Top Up", path: "/wallet/top-up", icon: CreditCard },
          { label: "Payouts", path: "/wallet/payouts", icon: Landmark },
        ]}
      />

      {/* ── 4. Property Management ── */}
      <SettingsSectionCard
        title="Property Management"
        items={[
          { label: "Properties", path: "/dashboard/properties", icon: Building2 },
          { label: "Tenants", path: "/dashboard/properties/tenants", icon: Users },
          { label: "Leases", path: "/dashboard/properties/leases", icon: KeyRound },
        ]}
      />

      {/* ── 5. Communication ── */}
      <SettingsSectionCard
        title="Communication"
        items={[
          { label: "Messages", path: "/orbit", icon: MessageSquare },
          { label: "Notifications", path: "/notifications", icon: Bell },
          { label: "Support Tickets", path: "/support/tickets", icon: HelpCircle, subtitle: "View all issues" },
        ]}
      />

      {/* ── 6. Activity ── */}
      <SettingsSectionCard
        title="Activity"
        items={[
          { label: "My Reviews", path: "/settings/reviews", icon: Star },
          { label: "Favorites", path: "/favorites", icon: Heart },
        ]}
      />

      {/* ── 7. Account & Security ── */}
      <SettingsSectionCard
        title="Account & Security"
        items={[
          { label: "Personal Info", path: "/settings/account", icon: User },
          { label: "Security & Privacy", path: "/settings/security", icon: Shield },
          { label: "Addresses", path: "/settings/addresses", icon: MapPin },
          { label: "Permissions", path: "/permissions", icon: Smartphone },
        ]}
      />

      {/* ── Sign Out ── */}
      <SettingsSectionCard
        title=""
        items={[
          { label: "Sign Out", onClick: handleSignOut, icon: LogOut, destructive: true },
        ]}
      />
      </div>
    </SubPageShell>
  );
}
