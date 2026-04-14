import SubPageShell from "@/components/layout/SubPageShell";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminOpsService } from "@/services";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function AdminMerchantApprovalQueuePage() {
  useUiEngine("admin-adminmerchantapprovalqueuepage");
  const navigate = useNavigate();

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-merchant-approval-queue"],
    queryFn: () => adminOpsService.fetchMerchantApprovalQueue(200) as Promise<any[]>,
    staleTime: 5000,
  });

  const approve = async (merchantId: string) => {
    try {
      await adminOpsService.approveMerchant(merchantId);
    } catch {
      toast.error("Could not approve merchant");
      return;
    }
    toast.success("Merchant approved");
    refetch();
  };

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
    </SubPageShell>
  );
}
