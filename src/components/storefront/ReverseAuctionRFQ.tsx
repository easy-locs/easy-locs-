/**
 * ReverseAuctionRFQ — ORBIT V1: Reverse auctions & request for quotes.
 * Buyer: post RFQs, compare quotes, select winner.
 * Seller: view RFQs, submit quotes, track status.
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
import { Gavel, Plus, Loader2, CheckCircle2, Clock, Send, Trophy, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface Props { shopId: string; mode?: "seller" | "buyer"; }

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function ReverseAuctionRFQ({ shopId, mode = "buyer" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", budget_max: "", quantity: "1", deadline_days: "7" });
  const [saving, setSaving] = useState(false);
  const [quoteForm, setQuoteForm] = useState<Record<string, { price: string; delivery_days: string; message: string }>>({});
  const [selectedRfq, setSelectedRfq] = useState<string | null>(null);

  const { data: rfqs = [] } = useQuery({
    queryKey: ["rfqs", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_rfqs")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["rfq-quotes", shopId, selectedRfq],
    queryFn: async () => {
      if (!selectedRfq) return [];
      const { data } = await (supabase as any).from("storefront_rfq_quotes")
        .select("*").eq("rfq_id", selectedRfq).order("price", { ascending: true });
      return data || [];
    },
    enabled: !!selectedRfq,
  });

  const createRFQ = async () => {
    if (!user || !form.title) return;
    setSaving(true);
    try {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + (parseInt(form.deadline_days) || 7));
      await (supabase as any).from("storefront_rfqs").insert({
        shop_id: shopId, buyer_id: user.id, title: form.title, description: form.description || null,
        budget_max: form.budget_max ? parseFloat(form.budget_max) : null,
        quantity: parseInt(form.quantity) || 1, deadline: deadline.toISOString(),
      });
      qc.invalidateQueries({ queryKey: ["rfqs", shopId] });
      setForm({ title: "", description: "", budget_max: "", quantity: "1", deadline_days: "7" });
      setCreating(false);
      toast.success("RFQ posted");
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const submitQuote = async (rfqId: string) => {
    if (!user) return;
    const qf = quoteForm[rfqId];
    if (!qf?.price) return;
    await (supabase as any).from("storefront_rfq_quotes").insert({
      rfq_id: rfqId, vendor_id: user.id, price: parseFloat(qf.price),
      delivery_days: parseInt(qf.delivery_days) || null, message: qf.message || null,
      vendor_name: user.email?.split("@")[0] || "Vendor",
    });
    qc.invalidateQueries({ queryKey: ["rfq-quotes", shopId, rfqId] });
    setQuoteForm(prev => ({ ...prev, [rfqId]: { price: "", delivery_days: "", message: "" } }));
    toast.success("Quote submitted");
  };

  const selectWinner = async (rfqId: string, quoteId: string) => {
    await (supabase as any).from("storefront_rfqs").update({
      status: "awarded", winning_quote_id: quoteId, updated_at: new Date().toISOString(),
    }).eq("id", rfqId);
    await (supabase as any).from("storefront_rfq_quotes").update({ selected: true, status: "won" }).eq("id", quoteId);
    qc.invalidateQueries({ queryKey: ["rfqs", shopId] });
    qc.invalidateQueries({ queryKey: ["rfq-quotes", shopId, rfqId] });
    toast.success("Winner selected!");
  };

  const openRfqs = rfqs.filter((r: any) => r.status === "open");
  const myRfqs = rfqs.filter((r: any) => r.buyer_id === user?.id);

  const statusColor = (s: string) => {
    if (s === "open") return "bg-primary/10 text-primary";
    if (s === "awarded") return "bg-green-500/10 text-green-600";
    return "bg-muted text-muted-foreground";
  };

  if (mode === "buyer") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" /> Request for Quotes
          </h3>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setCreating(!creating)}>
            <Plus className="h-3 w-3" /> New RFQ
          </Button>
        </div>

        {creating && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-xs">What do you need?</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="Custom website design" />
              </div>
              <div>
                <Label className="text-xs">Details</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Max Budget</Label>
                  <Input type="number" value={form.budget_max} onChange={e => setForm({ ...form, budget_max: e.target.value })} className="mt-1" placeholder="Optional" />
                </div>
                <div>
                  <Label className="text-xs">Quantity</Label>
                  <Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Deadline (days)</Label>
                  <Input type="number" value={form.deadline_days} onChange={e => setForm({ ...form, deadline_days: e.target.value })} className="mt-1" />
                </div>
              </div>
              <Button size="sm" className="w-full" onClick={createRFQ} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Post RFQ"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* My RFQs */}
        {myRfqs.map((rfq: any) => (
          <Card key={rfq.id} className="cursor-pointer" onClick={() => setSelectedRfq(selectedRfq === rfq.id ? null : rfq.id)}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{rfq.title}</h4>
                <Badge className={`text-[10px] ${statusColor(rfq.status)}`}>{rfq.status}</Badge>
              </div>
              {rfq.budget_max && <p className="text-xs text-muted-foreground">Budget: ≤ {fmtPrice(rfq.budget_max, rfq.currency)}</p>}
              {rfq.deadline && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Deadline: {new Date(rfq.deadline).toLocaleDateString()}
                </p>
              )}

              {selectedRfq === rfq.id && quotes.length > 0 && (
                <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                  <p className="text-xs font-semibold">{quotes.length} Quotes</p>
                  {quotes.map((q: any) => (
                    <div key={q.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-xs font-medium">{q.vendor_name || "Vendor"}</p>
                        <p className="text-sm font-bold text-primary">{fmtPrice(q.price, q.currency)}</p>
                        {q.delivery_days && <p className="text-[10px] text-muted-foreground">{q.delivery_days} days delivery</p>}
                      </div>
                      {rfq.status === "open" && (
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={(e) => { e.stopPropagation(); selectWinner(rfq.id, q.id); }}>
                          <Trophy className="h-3 w-3" /> Select
                        </Button>
                      )}
                      {q.selected && <Badge className="bg-green-500/10 text-green-600 text-[10px]">Winner</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Seller mode — view open RFQs and submit quotes
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Gavel className="h-4 w-4 text-primary" /> Open RFQs
        <Badge variant="outline" className="text-[10px]">{openRfqs.length}</Badge>
      </h3>

      {openRfqs.map((rfq: any) => {
        const qf = quoteForm[rfq.id] || { price: "", delivery_days: "", message: "" };
        return (
          <Card key={rfq.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{rfq.title}</h4>
                {rfq.budget_max && <span className="text-xs text-muted-foreground">≤ {fmtPrice(rfq.budget_max)}</span>}
              </div>
              {rfq.description && <p className="text-xs text-muted-foreground">{rfq.description}</p>}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>Qty: {rfq.quantity}</span>
                {rfq.deadline && <span>Deadline: {new Date(rfq.deadline).toLocaleDateString()}</span>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" placeholder="Price" className="h-7 text-xs"
                  value={qf.price} onChange={e => setQuoteForm(prev => ({ ...prev, [rfq.id]: { ...qf, price: e.target.value } }))} />
                <Input type="number" placeholder="Days" className="h-7 text-xs"
                  value={qf.delivery_days} onChange={e => setQuoteForm(prev => ({ ...prev, [rfq.id]: { ...qf, delivery_days: e.target.value } }))} />
                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => submitQuote(rfq.id)} disabled={!qf.price}>
                  <Send className="h-3 w-3" /> Quote
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {openRfqs.length === 0 && <p className="text-xs text-muted-foreground">No open RFQs.</p>}
    </div>
  );
}
