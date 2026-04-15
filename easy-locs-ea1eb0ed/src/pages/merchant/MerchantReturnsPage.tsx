import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import SubPageShell from "@/components/layout/SubPageShell";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RotateCcw, Loader2, Check, X, Eye, Package } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  returned: "bg-blue-100 text-blue-800",
  refunded: "bg-purple-100 text-purple-800",
  closed: "bg-gray-100 text-gray-800",
};

const REASON_LABELS: Record<string, string> = {
  defective: "Defective product",
  wrong_size: "Wrong size",
  not_as_described: "Not as described",
  changed_mind: "Changed mind",
  damaged_in_transit: "Damaged in transit",
  other: "Other",
};

export default function MerchantReturnsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ["merchant-returns", user?.id],
    queryFn: async () => {
      const { data } = await db
        .from("product_returns")
        .select("*, storefront_orders(id, total, currency, created_at, storefront_pages!storefront_orders_shop_id_fkey(name))")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const handleAction = async (returnId: string, action: "approved" | "rejected") => {
    setProcessing(true);
    try {
      const updates: Record<string, any> = {
        status: action,
        admin_notes: adminNotes || null,
        resolved_at: new Date().toISOString(),
      };

      if (action === "approved" && selectedReturn) {
        updates.refund_amount = selectedReturn.storefront_orders?.total || 0;
      }

      await db.from("product_returns").update(updates).eq("id", returnId);
      qc.invalidateQueries({ queryKey: ["merchant-returns"] });
      toast.success(`Return ${action}`);
      setSelectedReturn(null);
      setAdminNotes("");
    } catch {
      toast.error("Action failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Return Requests" icon={<RotateCcw className="h-5 w-5 text-primary" />} backTo="/me" />
      <div className="max-w-lg mx-auto px-4 py-4">
        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : returns.length === 0 ? (
          <EmptyState icon={<RotateCcw className="h-10 w-10 text-muted-foreground/40" />} title="No return requests" description="Return requests from customers will appear here" />
        ) : (
          <div className="space-y-3">
            {returns.map((ret: any) => (
              <Card key={ret.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono text-muted-foreground">#{ret.id.slice(0, 8)}</p>
                    <Badge className={`text-[10px] ${STATUS_COLORS[ret.status] || ""}`}>{ret.status}</Badge>
                  </div>
                  <p className="text-sm font-medium">{REASON_LABELS[ret.reason] || ret.reason}</p>
                  {ret.reason_details && <p className="text-xs text-muted-foreground">{ret.reason_details}</p>}
                  {ret.photos && ret.photos.length > 0 && (
                    <div className="flex gap-2">
                      {ret.photos.map((url: string, i: number) => (
                        <img key={i} src={url} alt={`Return photo ${i + 1}`} className="w-12 h-12 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(ret.created_at).toLocaleDateString()}</span>
                    {ret.storefront_orders && <span>Order: {ret.storefront_orders.total} {ret.storefront_orders.currency}</span>}
                  </div>
                  {ret.status === "requested" && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="flex-1 gap-1 h-8 text-xs" onClick={() => { setSelectedReturn(ret); }}>
                        <Eye className="h-3 w-3" /> Review
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedReturn} onOpenChange={v => { if (!v) setSelectedReturn(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Return Request</DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-3">
              <div className="text-sm">
                <p><strong>Reason:</strong> {REASON_LABELS[selectedReturn.reason]}</p>
                {selectedReturn.reason_details && <p className="text-muted-foreground mt-1">{selectedReturn.reason_details}</p>}
              </div>
              {selectedReturn.photos?.length > 0 && (
                <div className="flex gap-2">
                  {selectedReturn.photos.map((url: string, i: number) => (
                    <img key={i} src={url} alt={`Return photo ${i + 1}`} className="w-20 h-20 rounded-lg object-cover" />
                  ))}
                </div>
              )}
              <Textarea
                placeholder="Notes (optional)"
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-1"
                  onClick={() => handleAction(selectedReturn.id, "approved")}
                  disabled={processing}
                >
                  {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Approve & Refund
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-1"
                  onClick={() => handleAction(selectedReturn.id, "rejected")}
                  disabled={processing}
                >
                  <X className="h-3 w-3" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SubPageShell>
  );
}
