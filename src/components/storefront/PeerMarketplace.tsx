/**
 * PeerMarketplace — ORBIT V1: C2C peer-to-peer marketplace.
 * Users: create listings, browse, buy with escrow, verify identity.
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Loader2, ShieldCheck, MapPin, Eye, ShoppingCart, Truck, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props { shopId: string; mode?: "seller" | "buyer"; }

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "used_good", label: "Used - Good" },
  { value: "used_fair", label: "Used - Fair" },
  { value: "for_parts", label: "For Parts" },
];

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function PeerMarketplace({ shopId, mode = "buyer" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "", category: "", condition: "used_good", city: "", country: "" });
  const [saving, setSaving] = useState(false);

  const { data: listings = [] } = useQuery({
    queryKey: ["p2p-listings", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_p2p_listings")
        .select("*").eq("shop_id", shopId).eq("status", "active").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: myListings = [] } = useQuery({
    queryKey: ["p2p-my-listings", shopId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any).from("storefront_p2p_listings")
        .select("*").eq("shop_id", shopId).eq("seller_id", user.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user && mode === "seller",
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["p2p-tx", shopId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any).from("storefront_p2p_transactions")
        .select("*").or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const createListing = async () => {
    if (!user || !form.title || !form.price) return;
    setSaving(true);
    try {
      await (supabase as any).from("storefront_p2p_listings").insert({
        shop_id: shopId, seller_id: user.id, title: form.title, description: form.description || null,
        price: parseFloat(form.price), category: form.category || null, condition: form.condition,
        location_city: form.city || null, location_country: form.country || null,
      });
      qc.invalidateQueries({ queryKey: ["p2p-listings", shopId] });
      qc.invalidateQueries({ queryKey: ["p2p-my-listings", shopId, user?.id] });
      setForm({ title: "", description: "", price: "", category: "", condition: "used_good", city: "", country: "" });
      setCreating(false);
      toast.success("Listing created");
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const initiatePurchase = async (listing: any) => {
    if (!user) return;
    if (listing.seller_id === user.id) { toast.error("Can't buy your own item"); return; }
    await (supabase as any).from("storefront_p2p_transactions").insert({
      listing_id: listing.id, buyer_id: user.id, seller_id: listing.seller_id,
      amount: listing.price, currency: listing.currency,
      escrow_status: listing.escrow_enabled ? "held" : "none",
    });
    qc.invalidateQueries({ queryKey: ["p2p-tx", shopId, user?.id] });
    toast.success(listing.escrow_enabled ? "Purchase initiated — funds in escrow" : "Purchase initiated");
  };

  const updateTransaction = async (txId: string, updates: Record<string, any>) => {
    await (supabase as any).from("storefront_p2p_transactions").update(updates).eq("id", txId);
    qc.invalidateQueries({ queryKey: ["p2p-tx", shopId, user?.id] });
    toast.success("Updated");
  };

  const conditionLabel = (c: string) => CONDITIONS.find(co => co.value === c)?.label || c;

  const escrowStatusColor = (s: string) => {
    if (s === "held") return "bg-yellow-500/10 text-yellow-600";
    if (s === "released") return "bg-green-500/10 text-green-600";
    if (s === "disputed") return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  if (mode === "buyer") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> P2P Marketplace
          </h3>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setCreating(!creating)}>
            <Plus className="h-3 w-3" /> Sell Item
          </Button>
        </div>

        {creating && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="iPhone 14 Pro" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Price</Label>
                  <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Condition</Label>
                  <Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">City</Label>
                  <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Country</Label>
                  <Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={createListing} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Post Listing"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Listings */}
        {listings.filter((l: any) => l.seller_id !== user?.id).map((l: any) => (
          <Card key={l.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold">{l.title}</h4>
                <span className="text-lg font-bold text-primary">{fmtPrice(l.price, l.currency)}</span>
              </div>
              {l.description && <p className="text-xs text-muted-foreground line-clamp-2">{l.description}</p>}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <Badge variant="secondary" className="text-[10px]">{conditionLabel(l.condition)}</Badge>
                {(l.location_city || l.location_country) && (
                  <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{[l.location_city, l.location_country].filter(Boolean).join(", ")}</span>
                )}
                {l.verified_seller && <span className="flex items-center gap-0.5 text-primary"><ShieldCheck className="h-3 w-3" />Verified</span>}
                {l.escrow_enabled && <span className="flex items-center gap-0.5"><ShieldCheck className="h-3 w-3" />Escrow</span>}
              </div>
              <Button size="sm" className="w-full text-xs gap-1" onClick={() => initiatePurchase(l)}>
                <ShoppingCart className="h-3 w-3" /> Buy with {l.escrow_enabled ? "Escrow" : "Direct Payment"}
              </Button>
            </CardContent>
          </Card>
        ))}

        {/* My transactions */}
        {transactions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">My Transactions</p>
            {transactions.map((tx: any) => {
              const isBuyer = tx.buyer_id === user?.id;
              return (
                <Card key={tx.id}>
                  <CardContent className="p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{isBuyer ? "Purchase" : "Sale"}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{fmtPrice(tx.amount, tx.currency)}</span>
                        <Badge className={`text-[9px] ${escrowStatusColor(tx.escrow_status)}`}>{tx.escrow_status}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {!isBuyer && tx.status === "initiated" && !tx.seller_shipped && (
                        <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1"
                          onClick={() => updateTransaction(tx.id, { seller_shipped: true, status: "shipped" })}>
                          <Truck className="h-3 w-3" /> Mark Shipped
                        </Button>
                      )}
                      {isBuyer && tx.seller_shipped && !tx.buyer_confirmed && (
                        <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1"
                          onClick={() => updateTransaction(tx.id, { buyer_confirmed: true, status: "completed", escrow_status: "released", completed_at: new Date().toISOString() })}>
                          <CheckCircle2 className="h-3 w-3" /> Confirm Received
                        </Button>
                      )}
                      {isBuyer && tx.seller_shipped && !tx.buyer_confirmed && (
                        <Button size="sm" variant="ghost" className="text-[10px] h-6 gap-1 text-destructive"
                          onClick={() => updateTransaction(tx.id, { escrow_status: "disputed", dispute_reason: "Item not as described" })}>
                          <AlertTriangle className="h-3 w-3" /> Dispute
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Seller/admin mode
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" /> P2P Marketplace
        <Badge variant="outline" className="text-[10px]">{listings.length} listings</Badge>
      </h3>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Active", value: listings.length },
          { label: "Transactions", value: transactions.length },
          { label: "Disputes", value: transactions.filter((t: any) => t.escrow_status === "disputed").length },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className="text-sm font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {listings.slice(0, 10).map((l: any) => (
        <Card key={l.id}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{l.title}</p>
              <p className="text-[10px] text-muted-foreground">{fmtPrice(l.price, l.currency)} · {conditionLabel(l.condition)}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Eye className="h-3 w-3" /> {l.views_count || 0}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
