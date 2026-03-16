/**
 * GiftCardManager — Digital gift cards, store credit, promo codes.
 * Seller: create & manage. Buyer: purchase, redeem, transfer.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gift, CreditCard, Send, Loader2, Plus, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success/10 text-success",
  redeemed: "bg-primary/10 text-primary",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "GC-";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function GiftCardManager({ shopId, mode }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [amount, setAmount] = useState("25");
  const [type, setType] = useState("gift_card");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["storefront-gift-cards", shopId, mode],
    queryFn: async () => {
      let q = (supabase as any).from("storefront_gift_cards").select("*").eq("shop_id", shopId);
      if (mode === "buyer") q = q.or(`purchaser_id.eq.${user!.id},recipient_id.eq.${user!.id}`);
      const { data } = await q.order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!shopId && !!user,
  });

  const createCard = useMutation({
    mutationFn: async () => {
      const code = generateCode();
      const num = parseFloat(amount);
      if (!num || num < 1) throw new Error("Invalid amount");
      await (supabase as any).from("storefront_gift_cards").insert({
        shop_id: shopId,
        code,
        type,
        initial_amount: num,
        remaining_amount: num,
        purchaser_id: user!.id,
        recipient_email: recipientEmail || null,
        message: message || null,
        expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storefront-gift-cards"] });
      toast.success("Gift card created!");
      setCreating(false);
      setAmount("25");
      setRecipientEmail("");
      setMessage("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const redeemCard = useMutation({
    mutationFn: async () => {
      if (!redeemCode.trim()) throw new Error("Enter a code");
      const { data: card } = await (supabase as any)
        .from("storefront_gift_cards")
        .select("*")
        .eq("code", redeemCode.trim().toUpperCase())
        .eq("shop_id", shopId)
        .eq("status", "active")
        .maybeSingle();
      if (!card) throw new Error("Invalid or expired code");
      await (supabase as any).from("storefront_gift_cards").update({
        recipient_id: user!.id,
        updated_at: new Date().toISOString(),
      }).eq("id", card.id);
      await (supabase as any).from("storefront_gift_card_transactions").insert({
        gift_card_id: card.id,
        amount: 0,
        type: "purchase",
        user_id: user!.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storefront-gift-cards"] });
      toast.success("Gift card redeemed!");
      setRedeemCode("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            {mode === "seller" ? "Gift Cards & Credits" : "My Gift Cards"}
          </h3>
          <div className="flex gap-2">
            {!creating && (
              <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setCreating(true)}>
                <Plus className="h-3 w-3 mr-1" /> Create
              </Button>
            )}
          </div>
        </div>

        {/* Buyer redeem */}
        {mode === "buyer" && (
          <div className="flex gap-2">
            <Input
              value={redeemCode}
              onChange={e => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="Enter gift card code..."
              className="h-8 text-xs flex-1 uppercase font-mono"
            />
            <Button size="sm" className="h-8 text-xs" disabled={!redeemCode.trim() || redeemCard.isPending} onClick={() => redeemCard.mutate()}>
              {redeemCard.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Redeem"}
            </Button>
          </div>
        )}

        {/* Create form */}
        {creating && (
          <div className="space-y-3 p-3 rounded-xl border border-border bg-muted/20">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">Amount</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="h-8 text-xs mt-1" min="1" />
              </div>
              <div>
                <Label className="text-[10px]">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gift_card" className="text-xs">🎁 Gift Card</SelectItem>
                    <SelectItem value="store_credit" className="text-xs">💳 Store Credit</SelectItem>
                    <SelectItem value="promo" className="text-xs">🏷️ Promo Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[10px]">Recipient Email (optional)</Label>
              <Input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} className="h-8 text-xs mt-1" placeholder="friend@email.com" />
            </div>
            <div>
              <Label className="text-[10px]">Message (optional)</Label>
              <Input value={message} onChange={e => setMessage(e.target.value)} className="h-8 text-xs mt-1" placeholder="Happy birthday!" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs flex-1" disabled={createCard.isPending} onClick={() => createCard.mutate()}>
                {createCard.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Gift className="h-3 w-3 mr-1" />}
                Create Gift Card
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Cards list */}
        {cards.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No gift cards yet</p>
        ) : (
          <div className="space-y-2">
            {cards.map((card: any) => (
              <div key={card.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                <CreditCard className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold">{card.code}</span>
                    <button onClick={() => copyCode(card.code, card.id)}>
                      {copiedId === card.id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`text-[9px] ${STATUS_COLORS[card.status] || ""}`}>{card.status}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {card.remaining_amount}/{card.initial_amount} {card.currency}
                    </span>
                    {card.expires_at && (
                      <span className="text-[10px] text-muted-foreground">
                        Exp: {new Date(card.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {card.status === "active" && mode === "buyer" && card.purchaser_id === user?.id && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Send to friend">
                    <Send className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
