/**
 * V1ProfileSettingsPage — Clean card-based settings page.
 * Organized by section: Account, Business, Wallet, Notifications, Security, Preferences.
 */
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitStore } from "@/stores/orbitStore";
import { SettingsSectionCard } from "@/components/settings/SettingsSectionCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User, MapPin, CreditCard, Bell, Shield, Store,
  Settings, LogOut, HelpCircle, Moon, Globe, Heart,
  Briefcase, QrCode, Package, Truck
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function V1ProfileSettingsPage() {
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
    <div className="max-w-md mx-auto px-4 py-5 pb-[calc(90px+env(safe-area-inset-bottom,0px))] space-y-4">
      {/* Profile header */}
      <div className="rounded-2xl border border-border/15 bg-card p-5 flex items-center gap-4">
        <Avatar className="h-14 w-14 rounded-2xl border-2 border-accent/30">
          <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg rounded-2xl">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-foreground truncate">
            {profile?.displayName || "User"}
          </p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          {profile?.role && (
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent">
              {profile.role}
            </span>
          )}
        </div>
      </div>

      {/* Account */}
      <SettingsSectionCard
        title="Account"
        items={[
          { label: "Personal Info", path: "/settings/account", icon: User },
          { label: "Addresses", path: "/settings/addresses", icon: MapPin },
          { label: "Payment Methods", path: "/settings/payment-methods", icon: CreditCard },
          { label: "Favorites", path: "/favorites", icon: Heart },
        ]}
      />

      {/* Business */}
      <SettingsSectionCard
        title="Business"
        items={[
          { label: "Business Hub", path: "/seller/hub", icon: Store, subtitle: "Manage your shops" },
          { label: "Orders", path: "/my-orders", icon: Package },
          { label: "QR & POS", path: "/wallet/qr", icon: QrCode },
          { label: "Delivery", path: "/ride", icon: Truck },
        ]}
      />

      {/* Wallet */}
      <SettingsSectionCard
        title="Wallet"
        items={[
          { label: "Wallet Hub", path: "/wallet/hub", icon: Briefcase },
          { label: "Transaction History", path: "/wallet/history", icon: CreditCard },
        ]}
      />

      {/* Notifications */}
      <SettingsSectionCard
        title="Notifications"
        items={[
          { label: "Notification Center", path: "/notifications", icon: Bell },
          { label: "Preferences", path: "/settings/notifications", icon: Settings },
        ]}
      />

      {/* Security */}
      <SettingsSectionCard
        title="Security"
        items={[
          { label: "Security & Privacy", path: "/settings/security", icon: Shield },
        ]}
      />

      {/* Preferences */}
      <SettingsSectionCard
        title="Preferences"
        items={[
          { label: "Theme", path: "/settings/theme", icon: Moon },
          { label: "Language", path: "/settings/language", icon: Globe },
          { label: "Help & Support", path: "/support/tickets", icon: HelpCircle },
        ]}
      />

      {/* Sign Out */}
      <SettingsSectionCard
        title=""
        items={[
          { label: "Sign Out", onClick: handleSignOut, icon: LogOut, destructive: true },
        ]}
      />
    </div>
  );
}
