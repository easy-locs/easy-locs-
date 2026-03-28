/**
 * SettingsHome — "Me" Hub: Premium, clean, fully connected.
 * All paths verified against real App.tsx routes.
 */
import { useNavigate } from "react-router-dom";
import {
  User, CreditCard, MapPin, Bell, Store,
  Palette, Globe, ChevronRight, Headphones, Heart,
  Wallet, LogOut, Lock,
  QrCode, Package, BarChart3, Building2,
  Receipt, Users, Scale,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface MeItem {
  key: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  subtitle?: string;
  path: string;
  badge?: string;
}

interface MeSection {
  title: string;
  emoji: string;
  accent: string;
  items: MeItem[];
}

const ME_SECTIONS: MeSection[] = [
  {
    title: "Account",
    emoji: "👤",
    accent: "hsl(210 80% 52%)",
    items: [
      { key: "profile", icon: User, label: "Personal Info", subtitle: "Name, email, photo", path: "/settings/account" },
      { key: "security", icon: Lock, label: "Security", subtitle: "PIN, password, 2FA", path: "/settings/security" },
    ],
  },
  {
    title: "Money",
    emoji: "💳",
    accent: "hsl(270 60% 55%)",
    items: [
      { key: "wallet", icon: Wallet, label: "Wallet", subtitle: "Balance & top-up", path: "/wallet/hub" },
      { key: "cards", icon: CreditCard, label: "Payment Methods", subtitle: "Cards & accounts", path: "/settings/payment-methods" },
      { key: "history", icon: Receipt, label: "Transaction History", subtitle: "All transactions", path: "/wallet/hub" },
    ],
  },
  {
    title: "Business",
    emoji: "🏪",
    accent: "hsl(38 65% 50%)",
    items: [
      { key: "storefront", icon: Store, label: "My Storefront", subtitle: "Manage your shop", path: "/me" },
      { key: "shops", icon: Package, label: "My Shops", subtitle: "All stores", path: "/dashboard/my-shops" },
      { key: "pos", icon: QrCode, label: "POS & QR", subtitle: "In-store tools", path: "/pos" },
      { key: "orders", icon: Receipt, label: "Orders", subtitle: "Track & manage", path: "/my-orders" },
      { key: "analytics", icon: BarChart3, label: "Analytics", subtitle: "Performance", path: "/me" },
    ],
  },
  {
    title: "Property",
    emoji: "🏢",
    accent: "hsl(200 60% 50%)",
    items: [
      { key: "properties", icon: Building2, label: "Properties", subtitle: "Manage units", path: "/dashboard/properties" },
      { key: "tenants", icon: Users, label: "Tenants", subtitle: "Lease & contacts", path: "/dashboard/tenants" },
    ],
  },
  {
    title: "Communication",
    emoji: "💬",
    accent: "hsl(142 60% 45%)",
    items: [
      { key: "contacts", icon: Users, label: "Contacts", subtitle: "Directory", path: "/orbit/contacts" },
      { key: "notifications", icon: Bell, label: "Notifications", subtitle: "Push & alerts", path: "/settings/notifications" },
    ],
  },
  {
    title: "Preferences",
    emoji: "⚙️",
    accent: "hsl(220 50% 55%)",
    items: [
      { key: "language", icon: Globe, label: "Language & Region", subtitle: "Language, currency", path: "/settings/orbit" },
      { key: "theme", icon: Palette, label: "Appearance", subtitle: "Dark, light, branding", path: "/settings/preferences" },
      { key: "addresses", icon: MapPin, label: "Addresses", subtitle: "Home, work, saved", path: "/settings/addresses" },
      { key: "favorites", icon: Heart, label: "Favorites", subtitle: "Shops & items", path: "/favorites" },
    ],
  },
  {
    title: "Support",
    emoji: "🛟",
    accent: "hsl(280 50% 50%)",
    items: [
      { key: "help", icon: Headphones, label: "Help Center", subtitle: "FAQ & live chat", path: "/settings/support" },
      { key: "legal", icon: Scale, label: "Legal", subtitle: "Terms & privacy", path: "/legal" },
    ],
  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function SettingsHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = useOrbitIdentity();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  const avatarUrl = profile?.avatarUrl || user?.user_metadata?.avatar_url;
  const displayName = profile?.displayName || user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "User";
  const initials = displayName[0]?.toUpperCase() || "U";
  const role = profile?.role;

  return (
    <div className="app-mobile-page flex flex-col bg-background pb-[calc(80px+env(safe-area-inset-bottom,0px))]">
      {/* Premium Profile Header */}
      {user && (
        <div className="px-4 pt-6 pb-3">
          <button
            onClick={() => navigate("/settings/account")}
            className="w-full flex items-center gap-4 p-4 rounded-3xl bg-gradient-to-br from-primary/8 to-primary/3 border border-primary/10 active:scale-[0.98] transition-all duration-200"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0 ring-2 ring-primary/20" />
            ) : (
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 bg-primary text-primary-foreground shadow-lg">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-lg font-black text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {role && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">
                    {role}
                  </span>
                )}
                <span className="text-[10px] font-semibold text-primary/80 bg-primary/8 px-2 py-0.5 rounded-full">Edit profile</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0 text-primary/40" />
          </button>
        </div>
      )}

      {/* Sections */}
      <motion.div
        className="flex-1 px-4 space-y-2"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {ME_SECTIONS.map((section) => (
          <motion.div
            key={section.title}
            variants={fadeUp}
            className="rounded-2xl overflow-hidden bg-card border border-border/8 shadow-sm"
          >
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <span className="text-sm">{section.emoji}</span>
              <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground/60">
                {section.title}
              </h2>
            </div>

            {section.items.map((item, idx) => (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className="w-full px-4 py-2.5 flex items-center gap-3 active:bg-muted/30 transition-colors text-left"
                style={
                  idx < section.items.length - 1
                    ? { borderBottom: "1px solid hsl(var(--border) / 0.05)" }
                    : undefined
                }
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: section.accent.replace(")", " / 0.08)") }}
                >
                  <item.icon className="w-4 h-4" style={{ color: section.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold text-foreground block leading-tight">{item.label}</span>
                  {item.subtitle && (
                    <span className="text-[10px] text-muted-foreground/70 leading-tight">{item.subtitle}</span>
                  )}
                </div>
                {item.badge && (
                  <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
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
          <span className="text-sm font-bold text-destructive">Sign Out</span>
        </motion.button>

        <p className="text-center text-[10px] text-muted-foreground/25 pt-1 pb-4">Easy-Locs v2.0</p>
      </motion.div>
    </div>
  );
}
