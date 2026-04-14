import SubPageShell from "@/components/layout/SubPageShell";
import { db } from "@/services/db";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { isMerchantOpenNow } from "@/lib/merchant/availabilityEngine";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function AdminQualityOpsPage() {
  useUiEngine("admin-adminqualityopspage");
  const navigate = useNavigate();

  const { data: merchants = [], isLoading } = useQuery({
    queryKey: ["admin-quality-merchants"],
    queryFn: async () => {
      const { data, error } = await db
        .from("seed_merchants")
        .select("*")
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10000,
  });

  const lowRated = merchants.filter((m: any) => Number(m.rating ?? 5) < 3.8).length;
  const closedNow = merchants.filter(
    (m: any) => !isMerchantOpenNow((m as any).opening_hours ?? null).open
  ).length;
  const inactive = merchants.filter((m: any) => !m.is_active).length;
  const hidden = merchants.filter((m: any) => Number(m.visibility_score ?? 0) < 40).length;

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
          <h1 className="text-lg font-bold text-foreground">Quality Ops</h1>
          <p className="text-xs text-muted-foreground">Merchant health overview</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        <Metric title="Total Merchants" value={String(merchants.length)} />
        <Metric title="Low Rated (<3.8)" value={String(lowRated)} />
        <Metric title="Closed Now" value={String(closedNow)} />
        <Metric title="Inactive" value={String(inactive)} />
        <Metric title="Low Visibility" value={String(hidden)} />
      </div>

      {isLoading &&
        [1, 2, 3].map((i) => (
          <div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />
        ))}

      {!isLoading && (
        <div className="px-4 space-y-3">
          {merchants.slice(0, 20).map((row: any) => {
            const status = isMerchantOpenNow((row as any).opening_hours ?? null);

            return (
              <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
                <p className="text-sm font-bold text-foreground">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  ⭐ {Number(row.rating ?? 0).toFixed(1)} · visibility{" "}
                  {Number(row.visibility_score ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{status.reason}</p>
              </div>
            );
          })}
        </div>
      )}
    </SubPageShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
