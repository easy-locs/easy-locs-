import { useNavigate } from "react-router-dom";
import { tc } from "@/lib/i18n-canonical";

export function FinalQuickActionLauncher() {
  const navigate = useNavigate();

  const items = [
    { label: tc("discovery.vertical.food.cta_secondary"), path: "/food", emoji: "🍕" },
    { label: tc("discovery.vertical.grocery.title"), path: "/grocery", emoji: "🛒" },
    { label: tc("nav.orders"), path: "/my-orders", emoji: "📦" },
    { label: tc("nav.wallet"), path: "/wallet/hub", emoji: "💳" },
    { label: tc("nav.favorites"), path: "/favorites", emoji: "❤️" },
    { label: tc("nav.support"), path: "/support/tickets", emoji: "🎧" },
  ];

  return (
    <div className="px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground mb-3">
        Quick Actions
      </p>

      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="rounded-2xl bg-muted px-3 py-4 text-center active:scale-[0.98] transition-transform"
          >
            <div className="text-xl">{item.emoji}</div>
            <div className="text-xs font-bold text-foreground mt-1">{item.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
