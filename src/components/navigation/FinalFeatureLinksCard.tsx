import { useNavigate } from "react-router-dom";

export function FinalFeatureLinksCard() {
  const navigate = useNavigate();

  const rows = [
    { label: "My Profile", path: "/me" },
    { label: "Favorites", path: "/favorites" },
    { label: "Saved Carts", path: "/me/saved-carts" },
    { label: "Auto Repeat", path: "/me/auto-repeat" },
    { label: "Redeem Rewards", path: "/me/redeem-rewards" },
    { label: "Support Tickets", path: "/support/tickets" },
  ];

  return (
    <div className="px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground mb-3">
        Quick Access
      </p>

      <div className="space-y-2">
        {rows.map((row) => (
          <button
            key={row.path}
            onClick={() => navigate(row.path)}
            className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground text-left active:scale-[0.98] transition-transform w-full"
          >
            {row.label}
          </button>
        ))}
      </div>
    </div>
  );
}
