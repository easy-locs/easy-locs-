/**
 * CustomerProfilePage — Central "Me" hub.
 * Clean card-based layout with 6 business sections.
 * No sidebar dependence. Direct navigation to real pages.
 */
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitStore } from "@/stores/orbitStore";
import { SettingsSectionCard } from "@/components/settings/SettingsSectionCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Store, ShoppingBag, QrCode, Receipt, BarChart3,
  Wallet, ArrowLeftRight, Landmark, CreditCard,
  Building2, Home, KeyRound, Users,
  MessageSquare, Bell, Phone, HelpCircle,
  User, Shield, Fingerprint, Moon, Globe, LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function CustomerProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = useOrbitStore((s) => s.profile);

  const initials = (profile?.displayName || user?.email || "U")
    .split(/[\s@]/)
    .map((w) => w[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/login");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-[calc(90px+env(safe-area-inset-bottom,0px))] space-y-3">
      {/* ── Profile identity ── */}
      <div className="rounded-2xl border border-border/15 bg-card p-4 flex items-center gap-3.5">
        <Avatar className="h-12 w-12 rounded-2xl border-2 border-accent/30">
          <AvatarFallback className="bg-primary text-primary-foreground font-bold text-base rounded-2xl">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground truncate">
            {profile?.displayName || "User"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          {profile?.role && (
            <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-px rounded-full bg-accent/15 text-accent">
              {profile.role}
            </span>
          )}
        </div>
      </div>

      {/* ── 1. Seller Hub ── */}
      <SettingsSectionCard
        title="Seller Hub"
        items={[
          { label: "My Shops", path: "/seller/hub", icon: Store, subtitle: "Manage stores & catalog" },
          { label: "Sales Dashboard", path: "/seller/analytics", icon: BarChart3 },
          { label: "Product Catalog", path: "/seller/products", icon: ShoppingBag },
        ]}
      />

      {/* ── 2. POS / Orders / Sales ── */}
      <SettingsSectionCard
        title="POS & Orders"
        items={[
          { label: "POS Terminal", path: "/merchant/pos", icon: QrCode },
          { label: "My Orders", path: "/my-orders", icon: Receipt },
          { label: "Merchant Orders", path: "/merchant/orders", icon: ShoppingBag },
        ]}
      />

      {/* ── 3. Wallet / Payments / Payouts ── */}
      <SettingsSectionCard
        title="Wallet & Payments"
        items={[
          { label: "Wallet Hub", path: "/wallet/hub", icon: Wallet },
          { label: "Transactions", path: "/wallet/history", icon: ArrowLeftRight },
          { label: "Payouts", path: "/wallet/payouts", icon: Landmark },
          { label: "Payment Methods", path: "/settings/payment-methods", icon: CreditCard },
        ]}
      />

      {/* ── 4. Property Management ── */}
      <SettingsSectionCard
        title="Property Management"
        items={[
          { label: "Properties", path: "/real-estate", icon: Building2 },
          { label: "Units", path: "/real-estate/units", icon: Home },
          { label: "Tenants", path: "/real-estate/tenants", icon: Users },
          { label: "Leases", path: "/real-estate/leases", icon: KeyRound },
        ]}
      />

      {/* ── 5. Communication ── */}
      <SettingsSectionCard
        title="Communication"
        items={[
          { label: "Messages", path: "/orbit", icon: MessageSquare },
          { label: "Notifications", path: "/notifications", icon: Bell },
          { label: "Calls", path: "/orbit", icon: Phone },
          { label: "Support", path: "/support/tickets", icon: HelpCircle },
        ]}
      />

      {/* ── 6. Account / Security / Verification ── */}
      <SettingsSectionCard
        title="Account & Security"
        items={[
          { label: "Personal Info", path: "/settings/account", icon: User },
          { label: "Security & Privacy", path: "/settings/security", icon: Shield },
          { label: "Verification", path: "/settings/verification", icon: Fingerprint },
          { label: "Theme", path: "/settings/theme", icon: Moon },
          { label: "Language", path: "/settings/language", icon: Globe },
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
  );
}
