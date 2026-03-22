/**
 * SettingsHome — "Me" Hub: Premium, smart, future-proof layout.
 * Organized by user priority: Identity → Finance → Business → Communication → Preferences → Support.
 */
import { useNavigate } from "react-router-dom";
import {
  User, CreditCard, MapPin, Bell, Shield, Store,
  Palette, Globe, ChevronRight, FileText, Headphones, Heart,
  Wallet, LogOut, Lock, Phone, Briefcase,
  QrCode, Package, BarChart3, Settings, Building2,
  Scan, Receipt, TrendingUp, Users, MessageCircle,
  Banknote, Crown, HelpCircle, Scale,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface MeItem {
  key: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  path: string;
  badge?: string;
}

interface MeSection {
  title: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
  items: MeItem[];
}

const ME_SECTIONS: MeSection[] = [
  {
    title: "Account & Identity",
    icon: User,
    accent: "hsl(210 80% 52%)",
    items: [
      { key: "profile", icon: User, label: "Personal Info", path: "/settings/account" },
      { key: "security", icon: Lock, label: "Security & PIN", path: "/settings/security" },
      { key: "phone", icon: Phone, label: "Phone Number", path: "/settings/account" },
      { key: "verification", icon: Shield, label: "Verification", path: "/settings/security" },
    ],
  },
  {
    title: "Wallet & Finance",
    icon: Wallet,
    accent: "hsl(270 60% 55%)",
    items: [
      { key: "wallet", icon: Wallet, label: "Wallet Pro", path: "/wallet/hub" },
      { key: "cards", icon: CreditCard, label: "Payment Methods", path: "/settings/payment-methods" },
      { key: "payouts", icon: Banknote, label: "Payouts", path: "/wallet/payouts" },
      { key: "transactions", icon: Receipt, label: "Transactions", path: "/wallet/history" },
    ],
  },
  {
    title: "Seller Hub",
    icon: Store,
    accent: "hsl(38 65% 50%)",
    items: [
      { key: "seller", icon: Store, label: "My Storefront", path: "/seller" },
      { key: "shops", icon: Package, label: "My Shops", path: "/dashboard/my-shops" },
      { key: "pos", icon: QrCode, label: "POS & QR Menu", path: "/pos" },
      { key: "orders", icon: Receipt, label: "Orders", path: "/dashboard/orders" },
    ],
  },
  {
    title: "Analytics & Growth",
    icon: TrendingUp,
    accent: "hsl(160 55% 42%)",
    items: [
      { key: "analytics", icon: BarChart3, label: "Analytics", path: "/dashboard/reporting" },
      { key: "boost", icon: Crown, label: "Boost & Ads", path: "/dashboard/boost" },
    ],
  },
  {
    title: "Property Management",
    icon: Building2,
    accent: "hsl(200 60% 50%)",
    items: [
      { key: "properties", icon: Building2, label: "Properties", path: "/properties" },
      { key: "tenants", icon: Users, label: "Tenants", path: "/tenants" },
    ],
  },
  {
    title: "Communication",
    icon: MessageCircle,
    accent: "hsl(142 60% 45%)",
    items: [
      { key: "chat", icon: MessageCircle, label: "Chat Settings", path: "/settings/orbit" },
      { key: "contacts", icon: Users, label: "Contacts", path: "/orbit/contacts" },
      { key: "notifications", icon: Bell, label: "Push & Alerts", path: "/settings/notifications" },
    ],
  },
  {
    title: "Addresses & Favorites",
    icon: MapPin,
    accent: "hsl(16 85% 55%)",
    items: [
      { key: "addresses", icon: MapPin, label: "Saved Addresses", path: "/settings/addresses" },
      { key: "favorites", icon: Heart, label: "Favorites", path: "/favorites" },
    ],
  },
  {
    title: "Preferences",
    icon: Settings,
    accent: "hsl(220 50% 55%)",
    items: [
      { key: "language", icon: Globe, label: "Language & Region", path: "/settings/orbit" },
      { key: "theme", icon: Palette, label: "Appearance", path: "/settings/preferences" },
    ],
  },
  {
    title: "Help & Legal",
    icon: HelpCircle,
    accent: "hsl(280 50% 50%)",
    items: [
      { key: "help", icon: Headphones, label: "Help & Support", path: "/settings/support" },
      { key: "legal", icon: Scale, label: "Legal & Privacy", path: "/legal" },
    ],
  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

export default function SettingsHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  const initials = (user?.user_metadata?.display_name || user?.email || "U")[0].toUpperCase();
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background pb-24">
      {/* Profile Header */}
      {user && (
        <div className="px-4 pt-6 pb-2">
          <button
            onClick={() => navigate("/settings/account")}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/10 active:scale-[0.98] transition-transform shadow-sm"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 bg-primary/10 text-primary">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-lg font-bold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Edit profile →</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/30" />
          </button>
        </div>
      )}

      {/* Sections */}
      <motion.div
        className="flex-1 px-4 pt-2 space-y-2.5"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {ME_SECTIONS.map((section) => (
          <motion.div
            key={section.title}
            variants={fadeUp}
            className="rounded-2xl overflow-hidden bg-card border border-border/8"
          >
            {/* Section header */}
            <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-1.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: section.accent.replace(")", " / 0.12)") }}
              >
                <section.icon className="w-3.5 h-3.5" style={{ color: section.accent }} />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground/70">
                {section.title}
              </h2>
            </div>

            {/* Items */}
            {section.items.map((item, idx) => (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className="w-full h-[46px] px-4 flex items-center gap-3 active:bg-muted/30 transition-colors text-left"
                style={
                  idx < section.items.length - 1
                    ? { borderBottom: "1px solid hsl(var(--border) / 0.06)" }
                    : undefined
                }
              >
                <item.icon className="w-[18px] h-[18px] text-muted-foreground/60 shrink-0" />
                <span className="text-[13px] font-medium text-foreground flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                    {item.badge}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 shrink-0" />
              </button>
            ))}
          </motion.div>
        ))}

        {/* Sign Out */}
        <motion.button
          variants={fadeUp}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-destructive/6 border border-destructive/10 active:scale-[0.98] transition-transform"
        >
          <LogOut className="w-4 h-4 text-destructive" />
          <span className="text-sm font-semibold text-destructive">Sign Out</span>
        </motion.button>

        {/* App version — minimal */}
        <p className="text-center text-[10px] text-muted-foreground/30 pt-2 pb-4">Easy-Locs</p>
      </motion.div>
    </div>
  );
}
