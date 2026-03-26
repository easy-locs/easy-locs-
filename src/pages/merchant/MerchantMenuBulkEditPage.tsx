import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export default function MerchantMenuBulkEditPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [drafts, setDrafts] = useState<Record<string, any>>({});

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["merchant-menu-bulk", merchantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("menu_items")
        .select("*")
        .eq("merchant_id", merchantId)
        .limit(500);

      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!merchantId,
    staleTime: 10000,
  });

  const updateDraft = (id: string, key: string, value: any) => {
    setDrafts((p) => ({ ...p, [id]: { ...(p[id] || {}), [key]: value } }));
  };

  const saveAll = async () => {
    try {
      for (const [id, patch] of Object.entries(drafts)) {
        const { error } = await (supabase as any)
          .from("menu_items")
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      }
      toast.success("Menu updated");
      setDrafts({});
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Bulk update failed");
    }
  };

  return (
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Menu Bulk Edit</h1>
          <p className="text-xs text-muted-foreground">Edit prices and availability</p>
        </div>
      </div>

      <button onClick={saveAll} className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">
        Save All Changes
      </button>

      {isLoading && [1, 2].map((i) => (<div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />))}

      {!isLoading && items.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">No menu items yet</div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="px-4 space-y-3">
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
    </div>
  );
}
