/**
 * LoyaltyDashboard — Dual-mode: Seller manages loyalty program / Buyer views their points.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Plus, Loader2, Gift, TrendingUp, History } from "lucide-react";
import { toast } from "sonner";

interface LoyaltyDashboardProps {
  shopId: string;
  mode: "seller" | "buyer";
}

export default function LoyaltyDashboard({ shopId, mode }: LoyaltyDashboardProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreateTier, setShowCreateTier] = useState(false);
  const [tierName, setTierName] = useState("");
  const [tierMinPoints, setTierMinPoints] = useState("100");
  const [tierDiscount, setTierDiscount] = useState("5");
  const [tierEmoji, setTierEmoji] = useState("⭐");

  // Load loyalty program for this shop
  const { data: program, isLoading: loadingProgram } = useQuery({
    queryKey: ["loyalty-program", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_loyalty_programs")
        .select("*")
        .eq("shop_id", shopId)
        .maybeSingle();
      return data;
    },
  });

  // Load tiers
  const { data: tiers = [] } = useQuery({
    queryKey: ["loyalty-tiers", program?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_loyalty_tiers")
        .select("*")
        .eq("program_id", program!.id)
        .order("min_points");
      return data || [];
    },
    enabled: !!program?.id,
  });

  // Buyer: load my points
  const { data: myPoints } = useQuery({
    queryKey: ["my-loyalty-points", program?.id, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_loyalty_points")
        .select("*, storefront_loyalty_tiers(name, badge_emoji, discount_percent)")
        .eq("program_id", program!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!program?.id && !!user?.id && mode === "buyer",
  });

  // Buyer: load history
  const { data: history = [] } = useQuery({
    queryKey: ["my-loyalty-history", program?.id, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_loyalty_history")
        .select("*")
        .eq("program_id", program!.id)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!program?.id && !!user?.id && mode === "buyer",
  });

  // Seller: members count
  const { data: memberCount = 0 } = useQuery({
    queryKey: ["loyalty-members", program?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("storefront_loyalty_points")
        .select("id", { count: "exact", head: true })
        .eq("program_id", program!.id);
      return count || 0;
    },
    enabled: !!program?.id && mode === "seller",
  });

  const createProgram = async () => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from("storefront_loyalty_programs")
      .insert({ shop_id: shopId, user_id: user.id });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["loyalty-program", shopId] });
    toast.success("Loyalty program created!");
  };

  const createTier = async () => {
    if (!tierName.trim()) return toast.error("Name required");
    const { error } = await (supabase as any)
      .from("storefront_loyalty_tiers")
      .insert({
        program_id: program!.id,
        name: tierName.trim(),
        min_points: parseInt(tierMinPoints) || 0,
        discount_percent: parseFloat(tierDiscount) || 0,
        badge_emoji: tierEmoji,
      });
    if (error) return toast.error(error.message);
    setShowCreateTier(false);
    setTierName(""); setTierMinPoints("100"); setTierDiscount("5");
    qc.invalidateQueries({ queryKey: ["loyalty-tiers", program?.id] });
    toast.success("Tier created!");
  };

  if (loadingProgram) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  // Seller view
  if (mode === "seller") {
    if (!program) {
      return (
        <Card>
          <CardContent className="p-4 text-center space-y-3">
            <Trophy className="h-8 w-8 mx-auto text-primary/40" />
            <p className="text-sm text-muted-foreground">Enable loyalty rewards for your customers</p>
            <Button size="sm" className="text-xs" onClick={createProgram}>
              <Gift className="h-3 w-3 mr-1" /> Enable Loyalty Program
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Loyalty Program
          </h4>
          <Badge variant="outline" className="text-[10px]">{memberCount} members</Badge>
        </div>

        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">
              Customers earn <strong>{program.points_per_currency} point</strong> per {program.currency} spent.
              Points are awarded automatically on completed orders.
            </p>
          </CardContent>
        </Card>

        {/* Tiers */}
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-semibold">Reward Tiers ({tiers.length})</h5>
          <Button size="sm" variant="outline" className="text-[10px] h-6" onClick={() => setShowCreateTier(!showCreateTier)}>
            <Plus className="h-2.5 w-2.5 mr-1" /> Add Tier
          </Button>
        </div>

        {showCreateTier && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Tier Name</Label>
                  <Input value={tierName} onChange={e => setTierName(e.target.value)} placeholder="Gold" className="h-7 text-xs mt-0.5" />
                </div>
                <div>
                  <Label className="text-[10px]">Emoji</Label>
                  <Input value={tierEmoji} onChange={e => setTierEmoji(e.target.value)} className="h-7 text-xs mt-0.5" />
                </div>
                <div>
                  <Label className="text-[10px]">Min Points</Label>
                  <Input type="number" value={tierMinPoints} onChange={e => setTierMinPoints(e.target.value)} className="h-7 text-xs mt-0.5" />
                </div>
                <div>
                  <Label className="text-[10px]">Discount %</Label>
                  <Input type="number" value={tierDiscount} onChange={e => setTierDiscount(e.target.value)} className="h-7 text-xs mt-0.5" />
                </div>
              </div>
              <Button size="sm" className="w-full text-xs h-7" onClick={createTier}>Create Tier</Button>
            </CardContent>
          </Card>
        )}

        {tiers.map((t: any) => (
          <div key={t.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{t.badge_emoji}</span>
              <div>
                <p className="text-xs font-medium">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.min_points}+ points</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px]">{t.discount_percent}% off</Badge>
          </div>
        ))}
      </div>
    );
  }

  // Buyer view
  if (!program) return null;

  const currentTier = tiers.find((t: any) => (myPoints?.points || 0) >= t.min_points);
  const nextTier = tiers.find((t: any) => (myPoints?.points || 0) < t.min_points);
  const progress = nextTier ? Math.min(100, ((myPoints?.points || 0) / nextTier.min_points) * 100) : 100;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Loyalty Rewards</h4>
        </div>

        {/* Points display */}
        <div className="text-center py-2">
          <p className="text-3xl font-bold text-primary">{myPoints?.points || 0}</p>
          <p className="text-[10px] text-muted-foreground">points earned</p>
          {currentTier && (
            <Badge className="text-xs mt-1 bg-primary/10 text-primary">
              {currentTier.badge_emoji} {currentTier.name} • {currentTier.discount_percent}% off
            </Badge>
          )}
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{myPoints?.points || 0} pts</span>
              <span>{nextTier.badge_emoji} {nextTier.name} ({nextTier.min_points} pts)</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-border">
            <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
              <History className="h-3 w-3" /> Recent Activity
            </p>
            {history.slice(0, 5).map((h: any) => (
              <div key={h.id} className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">{h.reason}</span>
                <span className={`font-medium ${h.points_change > 0 ? "text-success" : "text-destructive"}`}>
                  {h.points_change > 0 ? "+" : ""}{h.points_change}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
