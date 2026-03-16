/**
 * StorefrontDealRoom — Module 10-11: Negotiate deals on shop items + auto-convert to orders.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Handshake, Plus, Clock, CheckCircle2, XCircle, ArrowRightLeft, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props { shopId: string; isSeller?: boolean; }

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  negotiating: "bg-info/10 text-info",
  offer_sent: "bg-primary/10 text-primary",
  counter_offer: "bg-accent/10 text-accent-foreground",
  accepted: "bg-success/10 text-success",
  completed: "bg-success/10 text-success",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock, negotiating: ArrowRightLeft, offer_sent: Package,
  accepted: CheckCircle2, completed: CheckCircle2, cancelled: XCircle,
};

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function StorefrontDealRoom({ shopId, isSeller = true }: Props) {
  const { user, orgId } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["storefront-deals", shopId],
    queryFn: async () => {
      const q = (supabase as any).from("deal_rooms").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(50);
      const { data } = await q;
      return data || [];
    },
  });

  const handleCounterOffer = async (dealId: string) => {
    const amount = parseFloat(counterAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    await (supabase as any).from("deal_rooms").update({
      counter_offer_amount: amount,
      status: "counter_offer",
      negotiation_round: (deals.find((d: any) => d.id === dealId)?.negotiation_round || 0) + 1,
      offer_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", dealId);
    setCounterAmount("");
    setActiveDealId(null);
    qc.invalidateQueries({ queryKey: ["storefront-deals", shopId] });
    toast.success("Counter-offer sent");
  };

  const handleAccept = async (deal: any) => {
    await (supabase as any).from("deal_rooms").update({
      status: "accepted",
      accepted_amount: deal.counter_offer_amount || deal.current_offer_amount,
      updated_at: new Date().toISOString(),
    }).eq("id", deal.id);
    qc.invalidateQueries({ queryKey: ["storefront-deals", shopId] });
    toast.success("Deal accepted!");
  };

  const handleReject = async (dealId: string) => {
    await (supabase as any).from("deal_rooms").update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    }).eq("id", dealId);
    qc.invalidateQueries({ queryKey: ["storefront-deals", shopId] });
    toast.success("Deal cancelled");
  };

  // Module 11: Auto-convert accepted deal → order + delivery
  const handleConvertToOrder = async (deal: any) => {
    if (!user || !orgId) return;
    setConverting(true);
    try {
      const amount = deal.accepted_amount || deal.current_offer_amount || 0;
      // Create order
      const { data: order } = await (supabase as any).from("storefront_orders").insert({
        shop_id: shopId,
        seller_id: deal.seller_id,
        buyer_id: deal.buyer_id,
        buyer_name: "",
        buyer_email: "",
        subtotal: amount,
        total: amount,
        currency: deal.current_offer_currency || "EUR",
        status: "pending",
        notes: `From deal #${deal.id.slice(0, 8)}`,
      }).select("id").single();

      if (order) {
        await (supabase as any).from("deal_rooms").update({
          converted_order_id: order.id,
          status: "completed",
          updated_at: new Date().toISOString(),
        }).eq("id", deal.id);
      }

      qc.invalidateQueries({ queryKey: ["storefront-deals", shopId] });
      toast.success("Deal converted to order!");
    } catch {
      toast.error("Conversion failed");
    } finally {
      setConverting(false);
    }
  };

  const activeDeal = deals.find((d: any) => d.id === activeDealId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Handshake className="h-4 w-4 text-primary" /> Deals ({deals.length})
        </h3>
      </div>

      {isLoading ? (
        <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : deals.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
          No deals yet. Buyers can negotiate prices directly.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {deals.map((deal: any) => {
            const Icon = STATUS_ICONS[deal.status] || Clock;
            const colorClass = STATUS_COLORS[deal.status] || "bg-muted text-muted-foreground";
            return (
              <Card key={deal.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorClass}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{deal.context_title || `Deal #${deal.id.slice(0, 8)}`}</p>
                        <p className="text-[10px] text-muted-foreground">Round {deal.negotiation_round || 1}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{deal.status}</Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span>Offer: <strong className="text-primary">{fmtPrice(deal.current_offer_amount || 0, deal.current_offer_currency)}</strong></span>
                    {deal.counter_offer_amount && (
                      <span>Counter: <strong className="text-accent-foreground">{fmtPrice(deal.counter_offer_amount, deal.current_offer_currency)}</strong></span>
                    )}
                    {deal.accepted_amount && (
                      <span>Final: <strong className="text-success">{fmtPrice(deal.accepted_amount, deal.current_offer_currency)}</strong></span>
                    )}
                  </div>

                  {/* Seller actions */}
                  {isSeller && ["pending", "offer_sent", "negotiating"].includes(deal.status) && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="text-xs gap-1 flex-1" onClick={() => { setActiveDealId(deal.id); setCounterAmount(""); }}>
                        <ArrowRightLeft className="h-3 w-3" /> Counter
                      </Button>
                      <Button size="sm" className="text-xs gap-1 flex-1" onClick={() => handleAccept(deal)}>
                        <CheckCircle2 className="h-3 w-3" /> Accept
                      </Button>
                      <Button size="sm" variant="destructive" className="text-xs gap-1" onClick={() => handleReject(deal.id)}>
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Counter offer input */}
                  {activeDealId === deal.id && (
                    <div className="flex gap-2 items-end pt-1">
                      <div className="flex-1">
                        <Label className="text-[10px]">Your counter offer</Label>
                        <Input type="number" value={counterAmount} onChange={e => setCounterAmount(e.target.value)} className="h-8 text-xs mt-0.5" placeholder="Amount" />
                      </div>
                      <Button size="sm" className="text-xs h-8" onClick={() => handleCounterOffer(deal.id)}>Send</Button>
                      <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setActiveDealId(null)}>Cancel</Button>
                    </div>
                  )}

                  {/* Convert to order */}
                  {deal.status === "accepted" && !deal.converted_order_id && isSeller && (
                    <Button size="sm" className="w-full text-xs gap-1.5 mt-1" onClick={() => handleConvertToOrder(deal)} disabled={converting}>
                      {converting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
                      Convert to Order
                    </Button>
                  )}

                  {deal.converted_order_id && (
                    <Badge className="text-[9px] bg-success/10 text-success">Order created ✓</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
