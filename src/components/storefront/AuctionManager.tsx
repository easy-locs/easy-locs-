/**
 * AuctionManager — Live auction system with countdown, bidding, auto-extend.
 * Seller: create/manage auctions. Buyer: place bids in real-time.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gavel, Clock, TrendingUp, Users, Loader2, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
  catalogItems?: any[];
}

function Countdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Ended"); return; }
      setUrgent(diff < 300000); // < 5 min
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h > 0 ? h + "h " : ""}${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <span className={`text-[11px] font-mono font-bold ${urgent ? "text-destructive animate-pulse" : "text-muted-foreground"}`}>
      <Clock className="h-3 w-3 inline mr-0.5" />{remaining}
    </span>
  );
}

export default function AuctionManager({ shopId, mode, catalogItems = [] }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [bidding, setBidding] = useState<string | null>(null);
  const [newAuction, setNewAuction] = useState({
    item_id: "", title: "", starting_price: "1", reserve_price: "",
    duration_hours: "24", auto_extend_minutes: "5",
  });

  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ["shop-auctions", shopId],
    queryFn: async () => {
      const q = (supabase as any).from("storefront_auctions").select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      const { data } = mode === "seller" ? await q : await q.eq("status", "active");
      return data || [];
    },
  });

  // Realtime for auction updates
  useEffect(() => {
    const channel = supabase
      .channel(`auctions-${shopId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "storefront_auctions", filter: `shop_id=eq.${shopId}` },
        () => qc.invalidateQueries({ queryKey: ["shop-auctions", shopId] })
      ).subscribe();
    return () => { removeRealtimeChannel(channel); };
  }, [shopId, qc]);

  const createAuction = async () => {
    if (!user) return;
    setCreating(true);
    const item = catalogItems.find(i => i.id === newAuction.item_id);
    const endsAt = new Date(Date.now() + Number(newAuction.duration_hours) * 3600000).toISOString();

    const { error } = await (supabase as any).from("storefront_auctions").insert({
      shop_id: shopId,
      item_id: newAuction.item_id || null,
      seller_id: user.id,
      title: newAuction.title || item?.title || "Auction",
      photo_url: item?.photo_url || null,
      starting_price: Number(newAuction.starting_price) || 1,
      reserve_price: newAuction.reserve_price ? Number(newAuction.reserve_price) : null,
      ends_at: endsAt,
      auto_extend_minutes: Number(newAuction.auto_extend_minutes) || 5,
    });

    setCreating(false);
    if (error) { toast.error("Failed to create auction"); return; }
    setShowCreate(false);
    setNewAuction({ item_id: "", title: "", starting_price: "1", reserve_price: "", duration_hours: "24", auto_extend_minutes: "5" });
    qc.invalidateQueries({ queryKey: ["shop-auctions", shopId] });
    toast.success("Auction created!");
  };

  const placeBid = async (auctionId: string) => {
    if (!user) return toast.error("Sign in to bid");
    const amount = Number(bidAmounts[auctionId]);
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");

    setBidding(auctionId);
    const { error } = await (supabase as any).from("storefront_auction_bids").insert({
      auction_id: auctionId,
      bidder_id: user.id,
      amount,
    });
    setBidding(null);

    if (error) {
      toast.error(error.message?.includes("higher") ? "Bid must be higher than current bid" : error.message || "Bid failed");
      return;
    }
    setBidAmounts(prev => ({ ...prev, [auctionId]: "" }));
    toast.success("Bid placed!");
  };

  const fmt = (n: number, c = "EUR") => {
    try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0 }).format(n); }
    catch { return `${n} ${c}`; }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Gavel className="h-4 w-4 text-primary" /> Auctions
        </h3>
        {mode === "seller" && (
          <Button size="sm" className="h-7 text-[10px] gap-1" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-3 w-3" /> New Auction
          </Button>
        )}
      </div>

      {/* Create form (seller) */}
      {showCreate && mode === "seller" && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div>
              <Label className="text-[10px]">Product</Label>
              <select
                value={newAuction.item_id}
                onChange={e => {
                  const item = catalogItems.find(i => i.id === e.target.value);
                  setNewAuction(prev => ({ ...prev, item_id: e.target.value, title: item?.title || prev.title }));
                }}
                className="w-full h-7 text-xs bg-muted rounded-lg px-2 border-none mt-1"
              >
                <option value="">Select product</option>
                {catalogItems.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
              </select>
            </div>
            <div><Label className="text-[10px]">Title</Label><Input value={newAuction.title} onChange={e => setNewAuction(p => ({ ...p, title: e.target.value }))} className="h-7 text-xs mt-1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">Starting Price</Label><Input value={newAuction.starting_price} onChange={e => setNewAuction(p => ({ ...p, starting_price: e.target.value }))} className="h-7 text-xs mt-1" type="number" /></div>
              <div><Label className="text-[10px]">Reserve Price</Label><Input value={newAuction.reserve_price} onChange={e => setNewAuction(p => ({ ...p, reserve_price: e.target.value }))} className="h-7 text-xs mt-1" type="number" placeholder="Optional" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">Duration (hours)</Label><Input value={newAuction.duration_hours} onChange={e => setNewAuction(p => ({ ...p, duration_hours: e.target.value }))} className="h-7 text-xs mt-1" type="number" /></div>
              <div><Label className="text-[10px]">Auto-extend (min)</Label><Input value={newAuction.auto_extend_minutes} onChange={e => setNewAuction(p => ({ ...p, auto_extend_minutes: e.target.value }))} className="h-7 text-xs mt-1" type="number" /></div>
            </div>
            <Button size="sm" className="w-full h-8 text-xs" onClick={createAuction} disabled={creating}>
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create Auction"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Auctions list */}
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : auctions.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-xs text-muted-foreground">
          {mode === "seller" ? "No auctions yet. Create one!" : "No active auctions"}
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {auctions.map((auction: any) => {
            const isActive = auction.status === "active" && new Date(auction.ends_at) > new Date();
            const isWinning = user && auction.current_bidder_id === user.id;
            const minBid = (auction.current_bid || auction.starting_price) + 1;

            return (
              <Card key={auction.id} className={isWinning ? "border-primary/30 bg-primary/5" : ""}>
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    {auction.photo_url && (
                      <img src={auction.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-foreground line-clamp-2 break-words leading-snug">{auction.title}</h4>
                        <Badge variant={isActive ? "default" : "secondary"} className="text-[8px] shrink-0">
                          {isActive ? "LIVE" : auction.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5">
                        <div>
                          <p className="text-[9px] text-muted-foreground">Current Bid</p>
                          <p className="text-sm font-bold text-primary">
                            {auction.current_bid ? fmt(auction.current_bid, auction.currency) : fmt(auction.starting_price, auction.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Bids</p>
                          <p className="text-xs font-semibold flex items-center gap-0.5">
                            <Users className="h-2.5 w-2.5" /> {auction.bid_count}
                          </p>
                        </div>
                        <div className="ml-auto text-right">
                          <Countdown endsAt={auction.ends_at} />
                        </div>
                      </div>

                      {isWinning && (
                        <p className="text-[10px] text-primary font-semibold mt-1">✅ You're winning!</p>
                      )}

                      {/* Bid input (buyer, active auction) */}
                      {mode === "buyer" && isActive && (
                        <div className="flex gap-1.5 mt-2">
                          <Input
                            type="number"
                            min={minBid}
                            value={bidAmounts[auction.id] || ""}
                            onChange={e => setBidAmounts(prev => ({ ...prev, [auction.id]: e.target.value }))}
                            placeholder={`Min: ${fmt(minBid, auction.currency)}`}
                            className="h-7 text-xs flex-1"
                          />
                          <Button size="sm" className="h-7 text-[10px] gap-1 shrink-0" onClick={() => placeBid(auction.id)} disabled={bidding === auction.id}>
                            {bidding === auction.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gavel className="h-3 w-3" />}
                            Bid
                          </Button>
                        </div>
                      )}

                      {auction.reserve_price && auction.current_bid && auction.current_bid < auction.reserve_price && (
                        <p className="text-[9px] text-warning flex items-center gap-0.5 mt-1">
                          <AlertTriangle className="h-2.5 w-2.5" /> Reserve not met
                        </p>
                      )}
                    </div>
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
