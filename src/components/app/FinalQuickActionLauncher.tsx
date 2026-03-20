import { useNavigate } from "react-router-dom";

export function FinalQuickActionLauncher() {
  const navigate = useNavigate();

  const items = [
    { label: "Food", path: "/food", emoji: "🍕" },
    { label: "Grocery", path: "/grocery", emoji: "🛒" },
    { label: "Orders", path: "/my-orders", emoji: "📦" },
    { label: "Wallet", path: "/wallet/hub", emoji: "💳" },
    { label: "Favorites", path: "/favorites", emoji: "❤️" },
    { label: "Support", path: "/support/tickets", emoji: "🎧" },
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
