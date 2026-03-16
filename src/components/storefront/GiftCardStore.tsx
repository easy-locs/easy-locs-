/**
 * GiftCardStore — ORBIT V1: Digital gift cards.
 * Seller: view issued cards, manage balances.
 * Buyer: purchase gift cards, check balance, redeem codes.
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
import { Gift, CreditCard, Send, Loader2, Copy, Check, Search } from "lucide-react";
import { toast } from "sonner";

interface Props { shopId: string; mode?: "seller" | "buyer"; }

const AMOUNTS = [10, 25, 50, 100, 250];

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function GiftCardStore({ shopId, mode = "buyer" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ amount: "", recipient_email: "", recipient_name: "", sender_name: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: myCards = [] } = useQuery({
    queryKey: ["gift-cards-v2", shopId, user?.id, mode],
    queryFn: async () => {
      if (!user) return [];
      const q = (supabase as any).from("storefront_gift_cards").select("*").eq("shop_id", shopId);
      if (mode === "buyer") q.or(`created_by.eq.${user.id},redeemed_by.eq.${user.id}`);
      const { data } = await q.order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["gc-transactions", shopId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any).from("storefront_gift_card_transactions")
        .select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!user && mode === "buyer",
  });

  const purchaseCard = async () => {
    if (!user || !form.amount) return;
    setSaving(true);
    try {
      const amount = parseFloat(form.amount);
      await (supabase as any).from("storefront_gift_cards").insert({
        shop_id: shopId, created_by: user.id,
        initial_amount: amount, remaining_amount: amount,
        recipient_email: form.recipient_email || null,
        recipient_name: form.recipient_name || null,
        sender_name: form.sender_name || null,
        personal_message: form.message || null,
      });
      qc.invalidateQueries({ queryKey: ["gift-cards-v2", shopId, user?.id, mode] });
      setForm({ amount: "", recipient_email: "", recipient_name: "", sender_name: "", message: "" });
      setCreating(false);
      toast.success("Gift card created!");
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const redeemCard = async () => {
    if (!user || !redeemCode.trim()) return;
    setRedeeming(true);
    try {
      const { data: card } = await (supabase as any).from("storefront_gift_cards")
        .select("*").eq("code", redeemCode.trim().toUpperCase()).eq("status", "active").maybeSingle();
      
      if (!card) { toast.error("Invalid or expired gift card"); return; }
      if (card.remaining_amount <= 0) { toast.error("Gift card has no balance"); return; }

      await (supabase as any).from("storefront_gift_cards").update({
        redeemed_by: user.id, redeemed_at: new Date().toISOString(),
      }).eq("id", card.id);

      qc.invalidateQueries({ queryKey: ["gift-cards-v2", shopId, user?.id, mode] });
      setRedeemCode("");
      toast.success(`Gift card redeemed! Balance: ${fmtPrice(card.remaining_amount, card.currency)}`);
    } catch { toast.error("Failed"); } finally { setRedeeming(false); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (mode === "buyer") {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" /> Gift Cards
        </h3>

        {/* Quick amounts */}
        {!creating && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {AMOUNTS.map(a => (
                <Button key={a} size="sm" variant="outline" className="text-xs"
                  onClick={() => { setForm({ ...form, amount: String(a) }); setCreating(true); }}>
                  {fmtPrice(a)}
                </Button>
              ))}
            </div>

            {/* Redeem section */}
            <div className="flex gap-2">
              <Input
                value={redeemCode}
                onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="Enter gift card code"
                className="h-8 text-xs uppercase flex-1 font-mono"
              />
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={redeemCard} disabled={redeeming || !redeemCode.trim()}>
                {redeeming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                Redeem
              </Button>
            </div>
          </div>
        )}

        {creating && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold">Send a Gift Card</h4>
              <div>
                <Label className="text-xs">Amount</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Recipient Name</Label>
                  <Input value={form.recipient_name} onChange={e => setForm({ ...form, recipient_name: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Recipient Email</Label>
                  <Input value={form.recipient_email} onChange={e => setForm({ ...form, recipient_email: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Your Name</Label>
                <Input value={form.sender_name} onChange={e => setForm({ ...form, sender_name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Personal Message</Label>
                <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="mt-1" rows={2} placeholder="Happy birthday! 🎉" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 gap-1" onClick={purchaseCard} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  Purchase & Send
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* My cards */}
        {myCards.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold">My Gift Cards</p>
            {myCards.map((gc: any) => (
              <Card key={gc.id} className={gc.remaining_amount > 0 ? "border-primary/20" : "opacity-60"}>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="text-xs font-mono font-bold tracking-wider">{gc.code}</span>
                      <button onClick={() => copyCode(gc.code)} className="p-0.5">
                        {copiedCode === gc.code ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                      </button>
                    </div>
                    <Badge variant={gc.remaining_amount > 0 ? "default" : "secondary"} className="text-[10px]">
                      {fmtPrice(gc.remaining_amount, gc.currency)}
                    </Badge>
                  </div>
                  {gc.recipient_name && (
                    <p className="text-[10px] text-muted-foreground">To: {gc.recipient_name}</p>
                  )}
                  {gc.personal_message && (
                    <p className="text-[10px] text-muted-foreground italic">"{gc.personal_message}"</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Seller mode
  const totalIssued = myCards.reduce((s: number, gc: any) => s + (gc.initial_amount || 0), 0);
  const totalRemaining = myCards.reduce((s: number, gc: any) => s + (gc.remaining_amount || 0), 0);
  const activeCards = myCards.filter((gc: any) => gc.status === "active" && gc.remaining_amount > 0);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Gift className="h-4 w-4 text-primary" /> Gift Cards
      </h3>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Issued", value: myCards.length },
          { label: "Total Value", value: fmtPrice(totalIssued) },
          { label: "Outstanding", value: fmtPrice(totalRemaining) },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className="text-sm font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeCards.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold">Active Cards</p>
          {activeCards.slice(0, 10).map((gc: any) => (
            <div key={gc.id} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs">
              <div className="flex items-center gap-2">
                <CreditCard className="h-3 w-3 text-primary" />
                <span className="font-mono">{gc.code}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{fmtPrice(gc.remaining_amount, gc.currency)}/{fmtPrice(gc.initial_amount, gc.currency)}</span>
                {gc.redeemed_by && <Badge variant="outline" className="text-[9px]">Claimed</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
