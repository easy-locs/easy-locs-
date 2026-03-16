/**
 * ReturnsManager — Seller-side returns & refunds management.
 * View return requests, approve/reject, process refunds.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw, CheckCircle, XCircle, DollarSign, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  requested: { label: "Requested", class: "bg-warning/15 text-warning" },
  approved: { label: "Approved", class: "bg-info/15 text-info" },
  rejected: { label: "Rejected", class: "bg-destructive/15 text-destructive" },
  refunded: { label: "Refunded", class: "bg-success/15 text-success" },
};

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function ReturnsManager({ shopId }: { shopId: string }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ["shop-returns", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_returns")
        .select("*, storefront_orders(buyer_name, buyer_email, total, currency)")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateStatus = async (id: string, status: string, sellerNotes?: string) => {
    const update: any = { status };
    if (sellerNotes) update.seller_notes = sellerNotes;
    if (status === "refunded" || status === "rejected") update.resolved_at = new Date().toISOString();
    
    await (supabase as any).from("storefront_returns").update(update).eq("id", id);
    qc.invalidateQueries({ queryKey: ["shop-returns", shopId] });
    toast.success(`Return ${status}`);
  };

  if (isLoading) return <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Returns & Refunds</h4>
          <Badge variant="outline" className="text-[10px] ml-auto">{returns.length}</Badge>
        </div>

        {returns.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No return requests</p>
          </div>
        ) : (
          returns.map((r: any) => {
            const badge = STATUS_BADGE[r.status] || STATUS_BADGE.requested;
            const order = r.storefront_orders;
            return (
              <div key={r.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">{order?.buyer_name || order?.buyer_email || "Customer"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()} · {fmtPrice(r.refund_amount, r.currency)}
                    </p>
                  </div>
                  <Badge variant="secondary" className={`text-[9px] ${badge.class}`}>{badge.label}</Badge>
                </div>
                
                <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                  <strong>Reason:</strong> {r.reason || "No reason provided"}
                </p>

                {r.status === "requested" && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Seller notes (optional)"
                      value={notes[r.id] || ""}
                      onChange={e => setNotes(p => ({ ...p, [r.id]: e.target.value }))}
                      className="text-xs h-16"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => updateStatus(r.id, "approved", notes[r.id])}>
                        <CheckCircle className="h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => updateStatus(r.id, "rejected", notes[r.id])}>
                        <XCircle className="h-3 w-3" /> Reject
                      </Button>
                    </div>
                  </div>
                )}

                {r.status === "approved" && (
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => updateStatus(r.id, "refunded")}>
                    <DollarSign className="h-3 w-3" /> Mark Refunded
                  </Button>
                )}

                {r.seller_notes && (
                  <p className="text-[10px] text-muted-foreground italic">Seller: {r.seller_notes}</p>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
