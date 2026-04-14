import SubPageShell from "@/components/layout/SubPageShell";
import { db } from "@/services/db";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function AdminOrderWatchPage() {
  useUiEngine("admin-adminorderwatchpage");
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-order-watch"],
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150);

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5000,
  });

  const active = rows.filter((row: any) =>
    ["paid", "confirmed", "preparing", "driver_search", "driver_assigned", "picked_up", "on_the_way"].includes(String(row.status ?? ""))
  ).length;
  const disputed = rows.filter((row: any) => String(row.status ?? "") === "disputed").length;
  const refunded = rows.filter((row: any) => String(row.status ?? "") === "refunded").length;

  return (
    <SubPageShell noContentPad className="bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Order Watch</h1>
          <p className="text-xs text-muted-foreground">Live operational order board</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 pb-4">
        <Metric title="Active" value={String(active)} />
        <Metric title="Disputed" value={String(disputed)} />
        <Metric title="Refunded" value={String(refunded)} />
      </div>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Order #{String(row.id).slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {Number(row.total_amount ?? 0).toFixed(2)} {row.currency ?? "AED"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
                  </p>
                </div>
                <OrderStatusBadge status={row.status || "draft"} />
              </div>
            </div>
          ))}
        </div>
      )}
    </SubPageShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
