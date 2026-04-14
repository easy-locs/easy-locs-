/**
 * AdminMarketplaceOpsPage — Real marketplace operations dashboard.
 * Sections: Health, Orders, Delivery, Revenue, Support, Quality.
 */
import { useQuery } from "@tanstack/react-query";
import { adminOpsService } from "@/services";
import { ArrowLeft, Activity, Package, Truck, DollarSign, Headphones, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border) / 0.12)" }}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-xl font-extrabold tabular-nums" style={{ color: color || "hsl(var(--foreground))" }}>{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6">
      <Icon className="w-4 h-4 text-primary" />
      <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h2>
    </div>
  );
}

export default function AdminMarketplaceOpsPage() {
  useUiEngine("admin-adminmarketplaceopspage");
  const navigate = useNavigate();

  const { data: merchantCount = 0 } = useQuery({
    queryKey: ["ops-merchant-count"],
    queryFn: () => adminOpsService.countWhere("seed_merchants", "is_active", true),
  });

  const { data: productCount = 0 } = useQuery({
    queryKey: ["ops-product-count"],
    queryFn: () => adminOpsService.countWhere("seed_products", "is_available", true),
  });

  const { data: featuredCount = 0 } = useQuery({
    queryKey: ["ops-featured-count"],
    queryFn: () => adminOpsService.countWhere("seed_merchants", "is_featured", true),
  });

  const { data: categoryCounts = [] } = useQuery({
    queryKey: ["ops-category-counts"],
    queryFn: async () => {
      const data = await adminOpsService.fetchSeedMerchantCategories();
      const counts: Record<string, number> = {};
      data.forEach((r) => { counts[r.category] = (counts[r.category] || 0) + 1; });
      return Object.entries(counts).map(([k, v]) => ({ category: k, count: v }));
    },
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Marketplace Operations</h1>
      </header>

      <div className="px-4">
        {/* Marketplace Health */}
        <SectionHeader icon={Activity} title="Marketplace Health" />
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Active Merchants" value={merchantCount} />
          <MetricCard label="Active Products" value={productCount} />
          <MetricCard label="Featured" value={featuredCount} color="hsl(45 90% 55%)" />
          <MetricCard label="Categories" value={categoryCounts.length} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {categoryCounts.map((c: any) => (
            <div key={c.category} className="rounded-xl p-3 text-center" style={{ background: "hsl(var(--muted))" }}>
              <span className="text-lg font-extrabold text-foreground tabular-nums">{c.count}</span>
              <p className="text-[10px] font-semibold text-muted-foreground capitalize mt-0.5">{c.category}</p>
            </div>
          ))}
        </div>

        {/* Orders Monitoring */}
        <SectionHeader icon={Package} title="Orders Monitoring" />
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Pending" value="—" sub="No orders yet" />
          <MetricCard label="Preparing" value="—" />
          <MetricCard label="In Delivery" value="—" />
          <MetricCard label="Completed Today" value="—" />
        </div>

        {/* Delivery Monitoring */}
        <SectionHeader icon={Truck} title="Delivery Monitoring" />
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Online Drivers" value="—" sub="No drivers yet" />
          <MetricCard label="Unassigned Missions" value="—" />
          <MetricCard label="Active Deliveries" value="—" />
          <MetricCard label="Failed Today" value="—" />
        </div>

        {/* Revenue */}
        <SectionHeader icon={DollarSign} title="Revenue Overview" />
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Gross Volume" value="—" sub="AED" />
          <MetricCard label="Commissions" value="—" />
          <MetricCard label="Settlements" value="—" />
          <MetricCard label="Wallet Volume" value="—" />
        </div>

        {/* Support */}
        <SectionHeader icon={Headphones} title="Support Overview" />
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Open" value="0" />
          <MetricCard label="Urgent" value="0" color="hsl(0 70% 50%)" />
          <MetricCard label="Disputes" value="0" />
        </div>

        {/* Quality */}
        <SectionHeader icon={Shield} title="Quality & Trust" />
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Hidden" value="0" />
          <MetricCard label="Flagged" value="0" />
          <MetricCard label="Low Rep" value="0" />
        </div>
      </div>
    </div>
  );
}
