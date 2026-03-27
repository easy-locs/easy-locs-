/**
 * MeCommandCenter — Unified "Me" page.
 * Clean, simple, role-aware: works for consumers, merchants, and property managers.
 * Only shows relevant sections based on user context.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitStore } from "@/stores/orbitStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  User, ChevronRight, LogOut,
  Wallet, ShoppingBag, Heart, QrCode,
  Store, Receipt, BarChart3, Megaphone,
  Building2, Users,
  MessageSquare, Bell, Headphones,
  Settings, Globe, MapPin, Moon,
  Shield,
} from "lucide-react";

/* ═══ Section definitions ═══ */

interface MeItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  subtitle: string;
  path: string;
  color: string;
}

interface MeSection {
  id: string;
  title: string;
  emoji: string;
  /** Only show if user has this context */
  showIf?: "always" | "merchant" | "property";
  items: MeItem[];
}

const SECTIONS: MeSection[] = [
  {
    id: "essentials",
    title: "Essentials",
    emoji: "⚡",
    showIf: "always",
    items: [
      { icon: Wallet, label: "Wallet", subtitle: "Balance & payments", path: "/wallet/hub", color: "text-emerald-500" },
      { icon: ShoppingBag, label: "My Orders", subtitle: "Track & reorder", path: "/my-orders", color: "text-blue-500" },
      { icon: Heart, label: "Favorites", subtitle: "Saved shops & items", path: "/saved", color: "text-rose-500" },
      { icon: QrCode, label: "Scan & Pay", subtitle: "QR payments", path: "/pay/scan", color: "text-violet-500" },
    ],
  },
  {
    id: "shop",
    title: "My Shop",
    emoji: "🏪",
    showIf: "merchant",
    items: [
      { icon: Store, label: "Storefront", subtitle: "Products & menu", path: "/seller/hub", color: "text-primary" },
      { icon: Receipt, label: "Orders", subtitle: "Live & history", path: "/merchant/orders", color: "text-blue-500" },
      { icon: BarChart3, label: "Analytics", subtitle: "Sales & insights", path: "/seller/analytics", color: "text-cyan-500" },
      { icon: Megaphone, label: "Promote", subtitle: "Boost & coupons", path: "/seller/boost", color: "text-amber-500" },
    ],
  },
  {
    id: "property",
    title: "Property",
    emoji: "🏢",
    showIf: "property",
    items: [
      { icon: Building2, label: "Properties", subtitle: "Units & listings", path: "/property-management", color: "text-primary" },
      { icon: Users, label: "Tenants", subtitle: "Leases & contacts", path: "/property-management/tenants", color: "text-blue-500" },
    ],
  },
  {
    id: "communication",
    title: "Communication",
    emoji: "💬",
    showIf: "always",
    items: [
      { icon: MessageSquare, label: "Messages", subtitle: "Chat & calls", path: "/orbit", color: "text-primary" },
      { icon: Bell, label: "Notifications", subtitle: "Alerts & updates", path: "/notifications", color: "text-amber-500" },
      { icon: Headphones, label: "Support", subtitle: "Help & tickets", path: "/support/tickets", color: "text-violet-500" },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    emoji: "⚙️",
    showIf: "always",
    items: [
      { icon: User, label: "Personal Info", subtitle: "Name & photo", path: "/settings/account", color: "text-foreground" },
      { icon: Shield, label: "Security", subtitle: "Password & PIN", path: "/settings/security", color: "text-foreground" },
      { icon: MapPin, label: "Addresses", subtitle: "Home & work", path: "/settings/addresses", color: "text-foreground" },
      { icon: Globe, label: "Language", subtitle: "Region & currency", path: "/settings/orbit", color: "text-foreground" },
      { icon: Moon, label: "Appearance", subtitle: "Theme & display", path: "/settings/preferences", color: "text-foreground" },
    ],
  },
];

/* ═══ Animations ═══ */
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const } },
};

/* ═══ Component ═══ */
export default function MeCommandCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = useOrbitStore((s) => s.profile);

  // Detect if user has shops (merchant context)
  const { data: shopCount } = useQuery({
    queryKey: ["me-shop-count", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("storefront_pages")
        .select("id", { count: "exact", head: true })
        .eq("owner_user_id", user!.id);
      return count ?? 0;
    },
  });

  // Detect if user has properties
  const { data: propCount } = useQuery({
    queryKey: ["me-prop-count", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return count ?? 0;
    },
  });

  const isMerchant = (shopCount ?? 0) > 0;
  const isPropertyManager = (propCount ?? 0) > 0;

  const visibleSections = useMemo(() => {
    return SECTIONS.filter((s) => {
      if (s.showIf === "always") return true;
      if (s.showIf === "merchant") return isMerchant;
      if (s.showIf === "property") return isPropertyManager;
      return true;
    });
  }, [isMerchant, isPropertyManager]);

  const avatarUrl = profile?.avatarUrl || user?.user_metadata?.avatar_url;
  const displayName = profile?.displayName || user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.split(/[\s@]/).map((w: string) => w[0]?.toUpperCase()).join("").slice(0, 2);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/login");
  };

  return (
    <div className="app-mobile-page app-mobile-content max-w-md mx-auto px-4 py-4 pb-[calc(90px+env(safe-area-inset-bottom,0px))]">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">

        {/* ── Profile Card ── */}
        <motion.button
          variants={fadeUp}
          onClick={() => navigate("/settings/account")}
          className="w-full flex items-center gap-4 p-4 rounded-3xl bg-gradient-to-br from-primary/8 to-primary/3 border border-primary/10 active:scale-[0.98] transition-all text-left"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0 ring-2 ring-primary/20" />
          ) : (
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 bg-primary text-primary-foreground shadow-lg">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground truncate">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {isMerchant && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">
                  🏪 Merchant
                </span>
              )}
              {isPropertyManager && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                  🏢 Property
                </span>
              )}
              {!isMerchant && !isPropertyManager && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  👤 Personal
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-primary/40 shrink-0" />
        </motion.button>

        {/* ── Become a merchant CTA (if not merchant) ── */}
        {!isMerchant && (
          <motion.button
            variants={fadeUp}
            onClick={() => navigate("/seller/onboarding")}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-accent/20 bg-accent/5 active:scale-[0.98] transition-transform text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Open your shop</p>
              <p className="text-[10px] text-muted-foreground">Start selling in minutes — free</p>
            </div>
            <ChevronRight className="w-4 h-4 text-accent shrink-0" />
          </motion.button>
        )}

        {/* ── Sections ── */}
        {visibleSections.map((section) => (
          <motion.div
            key={section.id}
            variants={fadeUp}
            className="rounded-2xl overflow-hidden bg-card border border-border/8"
          >
            {/* Section header */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <span className="text-sm">{section.emoji}</span>
              <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground/60">
                {section.title}
              </h2>
            </div>

            {/* Items */}
            {section.items.map((item, idx) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="w-full px-4 py-2.5 flex items-center gap-3 active:bg-muted/30 transition-colors text-left"
                style={idx < section.items.length - 1 ? { borderBottom: "1px solid hsl(var(--border) / 0.06)" } : undefined}
              >
                <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                  <item.icon className={cn("w-4 h-4", item.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold text-foreground block leading-tight">{item.label}</span>
                  <span className="text-[10px] text-muted-foreground/70 leading-tight">{item.subtitle}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 shrink-0" />
              </button>
            ))}
          </motion.div>
        ))}

        {/* ── Sign Out ── */}
        <motion.button
          variants={fadeUp}
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-destructive/6 border border-destructive/10 active:scale-[0.98] transition-transform"
        >
          <LogOut className="w-4 h-4 text-destructive" />
          <span className="text-sm font-bold text-destructive">Sign Out</span>
        </motion.button>

        <p className="text-center text-[10px] text-muted-foreground/25 pb-4">Easy-Locs v2.0</p>
      </motion.div>
    </div>
  );
}