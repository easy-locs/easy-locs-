/**
 * SettingsHome — Premium card-based settings hub.
 * Each category is a separate visual card with smart click buttons.
 */
import { useNavigate } from "react-router-dom";
import { useDinoPageAudit } from "@/hooks/useDinoPageAudit";
import {
  ArrowLeft, User, CreditCard, MapPin, Bell, Shield, Store,
  Palette, Globe, ChevronRight, FileText, Headphones, Heart,
  MessageCircle, Wallet, LogOut, Settings, Lock, Phone,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SETTINGS_CARDS = [
  {
    title: "Account",
    icon: User,
    color: "hsl(210 80% 52%)",
    items: [
      { key: "profile", icon: User, label: "Personal Info", path: "/settings/account" },
      { key: "security", icon: Lock, label: "Security & PIN", path: "/settings/security" },
      { key: "phone", icon: Phone, label: "Phone Number", path: "/settings/account" },
    ],
  },
  {
    title: "Orbit",
    icon: MessageCircle,
    color: "hsl(142 60% 45%)",
    items: [
      { key: "chat", icon: MessageCircle, label: "Chat Settings", path: "/orbit" },
      { key: "contacts", icon: User, label: "Contacts", path: "/orbit" },
    ],
  },
  {
    title: "Wallet & Payments",
    icon: Wallet,
    color: "hsl(38 65% 50%)",
    items: [
      { key: "wallet", icon: Wallet, label: "Wallet", path: "/wallet/hub" },
      { key: "cards", icon: CreditCard, label: "Payment Methods", path: "/settings/payment-methods" },
    ],
  },
  {
    title: "Addresses",
    icon: MapPin,
    color: "hsl(16 85% 55%)",
    items: [
      { key: "addresses", icon: MapPin, label: "Saved Addresses", path: "/settings/addresses" },
      { key: "favorites", icon: Heart, label: "Favorites", path: "/favorites" },
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    color: "hsl(270 60% 55%)",
    items: [
      { key: "notifs", icon: Bell, label: "Push & Alerts", path: "/settings/notifications" },
    ],
  },
  {
    title: "Security",
    icon: Shield,
    color: "hsl(0 70% 55%)",
    items: [
      { key: "privacy", icon: Shield, label: "Privacy & Security", path: "/settings/security" },
    ],
  },
  {
    title: "Business / Shop",
    icon: Store,
    color: "hsl(145 60% 42%)",
    items: [
      { key: "seller", icon: Store, label: "Seller Hub", path: "/seller" },
    ],
  },
  {
    title: "Preferences",
    icon: Settings,
    color: "hsl(200 60% 50%)",
    items: [
      { key: "language", icon: Globe, label: "Language & Region", path: "/settings/orbit" },
      { key: "theme", icon: Palette, label: "Appearance", path: "/settings/preferences" },
    ],
  },
  {
    title: "Support",
    icon: Headphones,
    color: "hsl(196 80% 50%)",
    items: [
      { key: "help", icon: Headphones, label: "Help & Support", path: "/settings/support" },
      { key: "legal", icon: FileText, label: "Legal", path: "/legal" },
    ],
  },
];

export default function SettingsHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  useDinoPageAudit({ actorType: "user", pageKey: "settings_home" });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate("/home")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "hsl(var(--muted))" }}
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Settings</h1>
      </header>

      {/* User Profile Card */}
      {user && (
        <div className="px-4 mb-4">
          <button
            onClick={() => navigate("/settings/account")}
            className="w-full flex items-center gap-3 p-4 rounded-2xl active:scale-[0.98] transition-transform"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
              style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
            >
              {(user.user_metadata?.display_name || user.email || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-base font-bold text-foreground truncate">
                {user.user_metadata?.display_name || user.email?.split("@")[0] || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tap to edit profile</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/30" />
          </button>
        </div>
      )}

      {/* Settings Cards */}
      <div className="flex-1 px-4 pb-24 space-y-3">
        {SETTINGS_CARDS.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl overflow-hidden"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.1)" }}
          >
            {/* Card header */}
            <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${card.color.replace(")", " / 0.1)")}` }}
              >
                <card.icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
              <h2 className="text-[13px] font-bold text-foreground">{card.title}</h2>
            </div>

            {/* Card items */}
            {card.items.map((item, idx) => (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className="w-full px-4 py-3 flex items-center gap-3 active:bg-muted/20 transition-colors text-left"
                style={idx < card.items.length - 1 ? { borderBottom: "1px solid hsl(var(--border) / 0.06)" } : undefined}
              >
                <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
              </button>
            ))}
          </div>
        ))}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
          style={{ background: "hsl(var(--destructive) / 0.06)", border: "1px solid hsl(var(--destructive) / 0.1)" }}
        >
          <LogOut className="w-4.5 h-4.5" style={{ color: "hsl(var(--destructive))" }} />
          <span className="text-sm font-semibold" style={{ color: "hsl(var(--destructive))" }}>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
