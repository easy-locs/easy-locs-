import { useState } from "react";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import { BackCard } from "@/components/ui/back-card";
import { computePlatformRevenue } from "@/lib/finance/treasury";

export default function ExecutiveDashboard() {
  const [revenue, setRevenue] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const total = await computePlatformRevenue({
        start: new Date(Date.now() - 30 * 86400000).toISOString(),
        end: new Date().toISOString(),
      });
      setRevenue(total);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-mobile-page bg-background p-4">
      <BackCard />
      <div className="mt-4">
        <h1 className="text-xl font-bold text-foreground">Executive Dashboard</h1>
        <p className="text-sm text-muted-foreground">Profit · Growth · Risk · Expansion</p>
      </div>

      <button
        onClick={load}
        disabled={loading}
        className="mt-4 rounded-xl bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Loading..." : "Load KPIs"}
      </button>

      {revenue !== null && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">30-day platform fee revenue</p>
          <p className="text-2xl font-bold text-foreground">{formatMoneyByCountry(revenue, null, "AED")}</p>
        </div>
      )}
    </div>
  );
}
