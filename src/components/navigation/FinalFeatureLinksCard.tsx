import { useNavigate } from "react-router-dom";
import { tc } from "@/lib/i18n-canonical";

export function FinalFeatureLinksCard() {
  const navigate = useNavigate();

  const rows = [
    { label: tc("nav.me"), path: "/me" },
    { label: tc("nav.favorites"), path: "/favorites" },
    { label: tc("commerce.saved_carts"), path: "/me/saved-carts" },
    { label: tc("commerce.auto_repeat"), path: "/me/auto-repeat" },
    { label: tc("wallet.redeem"), path: "/me/redeem-rewards" },
    { label: tc("nav.support"), path: "/support/tickets" },
  ];

  return (
    <div className="px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground mb-3">
        {tc("nav.quick_access")}
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
