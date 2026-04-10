/**
 * SmartShortcuts — Usage-frequency-based dynamic shortcuts.
 * Shows the user's most-visited features as quick-access pills.
 * Adapts over time as usage patterns change.
 */
import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Home, ShoppingBag, Wallet, MessageCircle, MapPin, User,
  Heart, Star, Store, Truck, Building2, QrCode, BarChart3,
  Settings, CreditCard, Search,
} from "lucide-react";
import { useI18n, tSafe } from "@/lib/i18n";

const ROUTE_META: Record<string, { icon: typeof Home; labelKey: string; fallback: string; color: string }> = {
  "/": { icon: Home, labelKey: "nav.home", fallback: "Home", color: "hsl(38 65% 56%)" },
  "/my-orders": { icon: ShoppingBag, labelKey: "me.orders", fallback: "Orders", color: "hsl(210 80% 52%)" },
  "/my-orders/active": { icon: ShoppingBag, labelKey: "me.orders", fallback: "Orders", color: "hsl(210 80% 52%)" },
  "/wallet": { icon: Wallet, labelKey: "nav.wallet", fallback: "Wallet", color: "hsl(152 60% 42%)" },
  "/orbit": { icon: MessageCircle, labelKey: "nav.orbit", fallback: "Orbit", color: "hsl(270 60% 55%)" },
  "/radar": { icon: MapPin, labelKey: "nav.radar", fallback: "Radar", color: "hsl(350 65% 55%)" },
  "/me": { icon: User, labelKey: "nav.me", fallback: "Me", color: "hsl(220 40% 18%)" },
  "/favorites": { icon: Heart, labelKey: "me.favorites", fallback: "Favorites", color: "hsl(350 65% 55%)" },
  "/me/loyalty-history": { icon: Star, labelKey: "me.loyalty", fallback: "Loyalty", color: "hsl(38 92% 50%)" },
  "/merchant/onboarding": { icon: Store, labelKey: "me.open_shop", fallback: "Open Shop", color: "hsl(38 65% 56%)" },
  "/mobility/taxi": { icon: Truck, labelKey: "home.qa_ride", fallback: "Taxi", color: "hsl(210 80% 52%)" },
  "/dashboard/real-estate": { icon: Building2, labelKey: "me.listings", fallback: "Property", color: "hsl(152 60% 42%)" },
  "/pay/scan": { icon: QrCode, labelKey: "home.scan", fallback: "Scan", color: "hsl(270 60% 55%)" },
  "/seller": { icon: BarChart3, labelKey: "me.analytics", fallback: "Analytics", color: "hsl(190 75% 46%)" },
  "/settings/account": { icon: Settings, labelKey: "me.personal_info", fallback: "Settings", color: "hsl(220 15% 50%)" },
  "/me/saved-cards": { icon: CreditCard, labelKey: "me.payment_methods", fallback: "Cards", color: "hsl(152 60% 42%)" },
  "/browse/food": { icon: Search, labelKey: "home.cat_food", fallback: "Food", color: "hsl(25 85% 55%)" },
};

const EXCLUDED = new Set(["/", "/login", "/register", "/onboarding"]);

interface Props {
  topRoutes: string[];
}

const SmartShortcuts = memo(({ topRoutes }: Props) => {
  const { t } = useI18n();

  const shortcuts = useMemo(() => {
    return topRoutes
      .filter(r => !EXCLUDED.has(r) && ROUTE_META[r])
      .slice(0, 4)
      .map(route => ({
        route,
        ...ROUTE_META[route],
      }));
  }, [topRoutes]);

  if (shortcuts.length < 2) return null;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 px-1 mb-1.5">
        <Star className="w-3 h-3" style={{ color: "hsl(38 65% 56%)" }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(220 40% 18%)" }}>
          {tSafe(t, "home.frequent", "Frequent")}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {shortcuts.map(({ route, icon: Icon, labelKey, fallback, color }) => (
          <Link
            key={route}
            to={route}
            className="flex flex-1 items-center gap-1.5 px-2.5 py-2 rounded-xl active:scale-[0.95] transition-all"
            style={{
              background: `${color}0A`,
              border: `1px solid ${color}14`,
            }}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
            <span className="text-[10px] font-bold text-foreground truncate">{tSafe(t, labelKey, fallback)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
});

export default SmartShortcuts;
