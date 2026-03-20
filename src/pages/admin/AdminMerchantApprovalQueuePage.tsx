import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminMerchantApprovalQueuePage() {
  const navigate = useNavigate();

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-merchant-approval-queue"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("seed_merchants")
        .select("*")
        .neq("onboarding_status", "ready")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 5000,
  });

  const approve = async (merchantId: string) => {
    const { error } = await (supabase as any)
      .from("seed_merchants")
      .update({
        onboarding_status: "ready",
        is_active: true,
        is_open: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", merchantId);

    if (error) {
      toast.error("Could not approve merchant");
      return;
    }
    toast.success("Merchant approved");
    refetch();
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Merchant Approval Queue</h1>
          <p className="text-xs text-muted-foreground">Review pending merchant setups</p>
        </div>
      </div>

      {isLoading && [1, 2].map((i) => (
        <div key={i} className="mx-4 mb-3 h-24 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No merchants pending approval</p>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <p className="text-sm font-bold text-foreground">{row.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {row.category} · {row.area || row.city || "Dubai"}
              </p>
              <span className="inline-block mt-2 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                Status {row.onboarding_status || "draft"}
              </span>

              <button
                onClick={() => approve(row.id)}
                className="mt-3 w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold"
              >
                Approve Merchant
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
