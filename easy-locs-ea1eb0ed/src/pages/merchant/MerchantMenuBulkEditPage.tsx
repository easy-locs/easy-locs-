import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { merchantService } from "@/services/merchant.service";
import { useState } from "react";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function MerchantMenuBulkEditPage() {
  useUiEngine("merchant-merchantmenubulkeditpage");
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [drafts, setDrafts] = useState<Record<string, any>>({});

  const { data: items = [], isLoading, refetch, isError } = useQuery({
    queryKey: ["merchant-menu-bulk", merchantId],
    queryFn: () => merchantService.fetchMenuItems(merchantId),
    enabled: !!merchantId,
    staleTime: 10000,
  });

  const updateDraft = (id: string, key: string, value: any) => {
    setDrafts((p) => ({ ...p, [id]: { ...(p[id] || {}), [key]: value } }));
  };

  const saveAll = async () => {
    try {
      for (const [id, patch] of Object.entries(drafts)) {
        await merchantService.updateMenuItem(id, patch);
      }
      toast.success("Menu updated");
      setDrafts({});
      refetch();
    } catch (e: any) {
      toast.error("Bulk update failed");
    }
  };

  return (
    <SubPageShell
      title="Menu Bulk Edit"
      subtitle="Edit prices and availability"
      onBack={() => navigate(`/merchant/dashboard/${merchantId}`)}
      rightAction={
        <button onClick={saveAll} className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold">
          Save All
        </button>
      }
      noContentPad
    >
      {isError && (
        <div className="px-4 py-4">
          <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
        </div>
      )}
      {isLoading && [1, 2].map((i) => (
        <div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && items.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">No menu items yet</div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="px-4 space-y-3 pt-2">
          {items.map((it: any) => {
            const d = drafts[it.id] || {};
            const price = d.price ?? it.price ?? 0;
            const active = d.is_active ?? it.is_active ?? true;

            return (
              <div key={it.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-2">
                <p className="text-sm font-bold text-foreground">{it.name}</p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => updateDraft(it.id, "price", Number(e.target.value))}
                    className="w-24 rounded-xl border border-border/20 bg-background px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => updateDraft(it.id, "is_active", !active)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}
                  >
                    {active ? "Active" : "Hidden"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SubPageShell>
  );
}
