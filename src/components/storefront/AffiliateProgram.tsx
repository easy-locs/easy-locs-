/**
 * AffiliateProgram — Affiliate/referral management for shops.
 * Sellers: view affiliates, stats, payouts.
 * Buyers: join program, get referral link, track earnings.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Link2, Copy, Check, DollarSign, MousePointer, ShoppingBag, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  shopSlug?: string;
  mode: "seller" | "buyer";
}

export default function AffiliateProgram({ shopId, shopSlug, mode }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);

  // Seller: list all affiliates
  const { data: affiliates = [], isLoading: loadingAll } = useQuery({
    queryKey: ["shop-affiliates", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_affiliates")
        .select("*")
        .eq("shop_id", shopId)
        .order("total_earned", { ascending: false });
      return data || [];
    },
    enabled: mode === "seller",
  });

  // Buyer: my affiliate record
  const { data: myAffiliate, isLoading: loadingMine } = useQuery({
    queryKey: ["my-affiliate", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_affiliates")
        .select("*")
        .eq("shop_id", shopId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: mode === "buyer" && !!user,
  });

  const joinProgram = async () => {
    if (!user) return toast.error("Sign in first");
    setJoining(true);
    const code = `${shopSlug || "shop"}-${user.id.slice(0, 6)}`.toUpperCase();
    await (supabase as any).from("storefront_affiliates").insert({
      shop_id: shopId,
      user_id: user.id,
      referral_code: code,
    });
    setJoining(false);
    qc.invalidateQueries({ queryKey: ["my-affiliate", shopId] });
    toast.success("Welcome to the affiliate program!");
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/s/${shopSlug || "shop"}?ref=${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Affiliate link copied!");
  };

  const fmt = (n: number) => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  if (mode === "seller") {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Affiliate Program
        </h3>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <Card><CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-foreground">{affiliates.length}</p>
            <p className="text-[9px] text-muted-foreground">Affiliates</p>
          </CardContent></Card>
          <Card><CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-foreground">{affiliates.reduce((s: number, a: any) => s + (a.total_conversions || 0), 0)}</p>
            <p className="text-[9px] text-muted-foreground">Conversions</p>
          </CardContent></Card>
          <Card><CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-primary">{fmt(affiliates.reduce((s: number, a: any) => s + (a.total_earned || 0), 0))}</p>
            <p className="text-[9px] text-muted-foreground">Paid Out</p>
          </CardContent></Card>
        </div>

        {/* Affiliates list */}
        {loadingAll ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : affiliates.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-xs text-muted-foreground">No affiliates yet</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {affiliates.map((aff: any) => (
              <Card key={aff.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-semibold">{aff.referral_code}</p>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{aff.total_clicks} clicks</span>
                      <span className="text-[10px] text-muted-foreground">{aff.total_conversions} sales</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-primary">{fmt(aff.total_earned)}</p>
                    <Badge variant="secondary" className="text-[8px]">{aff.commission_rate}%</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Buyer mode
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" /> Earn with Referrals
      </h3>

      {loadingMine ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
      ) : myAffiliate ? (
        <>
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold">Your Referral Link</span>
              </div>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/s/${shopSlug}?ref=${myAffiliate.referral_code}`}
                  className="h-8 text-[10px] font-mono bg-background"
                />
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => copyLink(myAffiliate.referral_code)}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-2">
            <Card><CardContent className="p-2 text-center">
              <MousePointer className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
              <p className="text-sm font-bold">{myAffiliate.total_clicks}</p>
              <p className="text-[9px] text-muted-foreground">Clicks</p>
            </CardContent></Card>
            <Card><CardContent className="p-2 text-center">
              <ShoppingBag className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
              <p className="text-sm font-bold">{myAffiliate.total_conversions}</p>
              <p className="text-[9px] text-muted-foreground">Sales</p>
            </CardContent></Card>
            <Card><CardContent className="p-2 text-center">
              <DollarSign className="h-3.5 w-3.5 mx-auto text-primary mb-0.5" />
              <p className="text-sm font-bold text-primary">{fmt(myAffiliate.total_earned)}</p>
              <p className="text-[9px] text-muted-foreground">Earned</p>
            </CardContent></Card>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Earn {myAffiliate.commission_rate}% on every sale from your link
          </p>
        </>
      ) : (
        <Card>
          <CardContent className="p-4 text-center space-y-3">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">Share this shop and earn commission on every sale!</p>
            <Button size="sm" className="h-8 text-xs gap-1" onClick={joinProgram} disabled={joining}>
              {joining ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
              Join Affiliate Program
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
