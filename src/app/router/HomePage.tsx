import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { useWalletStore } from "@/stores/walletStore";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { useActivityRealtime } from "@/hooks/useActivityRealtime";
import { registerPushNotifications } from "@/lib/push/registerPush";
import { usePushTokenStore } from "@/stores/pushTokenStore";
import {
  MessageCircle,
  Wallet,
  ShoppingBag,
  Car,
  QrCode,
  Package,
  CreditCard,
  Store,
  ChevronRight,
  Bell,
  Settings,
  LogOut,
  UtensilsCrossed,
  ShoppingCart,
  Wrench,
  Plane,
  Building2,
  Heart,
  Sparkles,
  Bike,
  Gift,
  Ticket,
} from "lucide-react";

const QUICK_ACTIONS = [
  { key: "orbit", label: "Chat", icon: MessageCircle, path: "/orbit", color: "bg-primary/10 text-primary" },
  { key: "marketplace", label: "Shop", icon: Store, path: "/achille", color: "bg-orange-500/10 text-orange-600" },
  { key: "ride", label: "Ride", icon: Car, path: "/mobility/taxi", color: "bg-blue-500/10 text-blue-600" },
  { key: "delivery", label: "Send", icon: Package, path: "/mobility/delivery", color: "bg-emerald-500/10 text-emerald-600" },
  { key: "wallet", label: "Wallet", icon: Wallet, path: "/wallet/hub", color: "bg-violet-500/10 text-violet-600" },
  { key: "scan", label: "Scan", icon: QrCode, path: "/pay/scan", color: "bg-amber-500/10 text-amber-600" },
  { key: "pay", label: "Pay", icon: CreditCard, path: "/wallet/hub", color: "bg-rose-500/10 text-rose-600" },
  { key: "orders", label: "Orders", icon: ShoppingBag, path: "/my-orders", color: "bg-teal-500/10 text-teal-600" },
];

const DISCOVER_CATEGORIES = [
  // Row 1
  { key: "food", label: "Food", icon: UtensilsCrossed, path: "/food", gradient: "from-orange-500/15 to-red-500/10", iconColor: "text-orange-500" },
  { key: "grocery", label: "Grocery", icon: ShoppingCart, path: "/grocery", gradient: "from-emerald-500/15 to-green-500/10", iconColor: "text-emerald-500" },
  { key: "services", label: "Services", icon: Wrench, path: "/services-hub", gradient: "from-blue-500/15 to-cyan-500/10", iconColor: "text-blue-500" },
  { key: "travel", label: "Travel", icon: Plane, path: "/explore", gradient: "from-violet-500/15 to-purple-500/10", iconColor: "text-violet-500" },
  { key: "property", label: "Property", icon: Building2, path: "/explore?vertical=property", gradient: "from-amber-500/15 to-yellow-500/10", iconColor: "text-amber-500" },
  // Row 2
  { key: "wellness", label: "Wellness", icon: Heart, path: "/explore?vertical=wellness", gradient: "from-rose-500/15 to-pink-500/10", iconColor: "text-rose-500" },
  { key: "beauty", label: "Beauty", icon: Sparkles, path: "/explore?vertical=beauty", gradient: "from-fuchsia-500/15 to-pink-500/10", iconColor: "text-fuchsia-500" },
  { key: "courier", label: "Courier", icon: Bike, path: "/mobility/delivery?mode=parcel", gradient: "from-teal-500/15 to-cyan-500/10", iconColor: "text-teal-500" },
  { key: "gifts", label: "Gifts", icon: Gift, path: "/achille?category=gifts", gradient: "from-red-500/15 to-rose-500/10", iconColor: "text-red-500" },
  { key: "events", label: "Events", icon: Ticket, path: "/explore?vertical=events", gradient: "from-indigo-500/15 to-blue-500/10", iconColor: "text-indigo-500" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const orbit = useOrbitIdentity();
  const wallet = useWalletStore((s) => s.wallet);
  const user = useV2AuthStore((s) => s.user);
  const signOut = useV2AuthStore((s) => s.signOut);

  useActivityRealtime();

  useEffect(() => {
    (async () => {
      const { token, platform } = await registerPushNotifications();
      if (token) await usePushTokenStore.getState().saveToken(token, platform);
    })();
  }, []);

  const displayName = orbit?.displayName || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const balance = wallet?.availableBalance ?? 0;
  const currency = wallet?.currency ?? "AED";

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="shrink-0 px-4 pt-[max(env(safe-area-inset-top,12px),12px)] pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/settings")}
              className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary active:scale-[0.95] transition-transform"
            >
              {orbit?.avatarUrl ? (
                <img src={orbit.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                initials
              )}
            </button>
            <div>
              <p className="text-[15px] font-bold text-foreground leading-tight">Hey, {displayName}</p>
              <p className="text-[11px] text-muted-foreground">What do you need today?</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("/notifications")}
              className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent/10 active:scale-[0.95] transition-all"
            >
              <Bell className="h-5 w-5 text-foreground/60" />
            </button>
            <button
              onClick={() => void signOut()}
              className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-destructive/10 active:scale-[0.95] transition-all"
            >
              <LogOut className="h-4 w-4 text-destructive/70" />
            </button>
          </div>
        </div>
      </header>

      {/* Wallet Card */}
      <div className="px-4 mb-4">
        <button
          onClick={() => navigate("/wallet/hub")}
          className="w-full rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-4 text-left active:scale-[0.98] transition-transform shadow-lg shadow-primary/10"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-primary-foreground/70 uppercase tracking-wide">Balance</p>
              <p className="text-2xl font-bold text-primary-foreground mt-0.5 tabular-nums">
                {balance.toLocaleString()} <span className="text-sm font-medium opacity-80">{currency}</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary-foreground/15 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-primary-foreground/70">
            <span className="text-[11px] font-medium">View wallet</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-5">
        <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-3">Quick Actions</p>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.key}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border/15 active:scale-[0.95] transition-transform"
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-semibold text-foreground">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Discover — 2-row horizontal scroll, premium cards */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Discover</p>
          <button
            onClick={() => navigate("/explore")}
            className="text-[11px] font-semibold text-primary active:scale-[0.97] transition-transform"
          >
            See all
          </button>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
          <div className="grid grid-rows-2 grid-flow-col gap-2.5 w-max">
            {DISCOVER_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => navigate(cat.path)}
                className={`flex items-center gap-3 w-[150px] rounded-2xl bg-gradient-to-br ${cat.gradient} border border-border/10 backdrop-blur-sm px-3.5 py-3 text-left active:scale-[0.96] transition-transform`}
              >
                <div className="h-9 w-9 rounded-xl bg-background/60 flex items-center justify-center shrink-0">
                  <cat.icon className={`h-[18px] w-[18px] ${cat.iconColor}`} />
                </div>
                <span className="text-[12px] font-bold text-foreground leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings shortcut */}
      <div className="px-4 mt-auto pb-4">
        <button
          onClick={() => navigate("/settings")}
          className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border/15 px-4 py-3 active:scale-[0.98] transition-transform"
        >
          <Settings className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Settings & Account</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
        </button>
      </div>
    </div>
  );
}