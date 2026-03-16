/**
 * AffiliateEngine — Full affiliate & referral program.
 * Seller: manage affiliates, view conversions, process payouts.
 * Buyer: join as affiliate, get links, track earnings.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Link2, DollarSign, TrendingUp, Copy, Check, Loader2, Award, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  shopSlug: string;
  mode: "seller" | "buyer";
}

export default function AffiliateEngine({ shopId, shopSlug, mode }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  // My affiliate status (buyer)
  const { data: myAffiliate } = useQuery({
    queryKey: ["my-affiliate", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_affiliates").select("*").eq("shop_id", shopId).eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: mode === "buyer" && !!user,
  });

  // All affiliates (seller)
  const { data: affiliates = [] } = useQuery({
    queryKey: ["shop-affiliates", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_affiliates").select("*").eq("shop_id", shopId).order("total_revenue", { ascending: false });
      return data || [];
    },
    enabled: mode === "seller",
  });

  // Conversions (seller)
  const { data: conversions = [] } = useQuery({
    queryKey: ["affiliate-conversions", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_affiliate_conversions").select("*, storefront_affiliates(affiliate_code, user_id)").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: mode === "seller",
  });

  // My conversions (buyer)
  const { data: myConversions = [] } = useQuery({
    queryKey: ["my-conversions", myAffiliate?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_affiliate_conversions").select("*").eq("affiliate_id", myAffiliate!.id).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!myAffiliate,
  });

  // My payouts (buyer)
  const { data: myPayouts = [] } = useQuery({
    queryKey: ["my-payouts", myAffiliate?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_affiliate_payouts").select("*").eq("affiliate_id", myAffiliate!.id).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!myAffiliate,
  });

  const joinProgram = useMutation({
    mutationFn: async () => {
      const code = `${shopSlug.slice(0, 8)}-${user!.id.slice(0, 6)}`.toUpperCase();
      await (supabase as any).from("storefront_affiliates").insert({
        shop_id: shopId,
        user_id: user!.id,
        affiliate_code: code,
        commission_rate: 10,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-affiliate"] });
      toast.success("Welcome to the affiliate program! 🎉");
    },
  });

  const approveConversion = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from("storefront_affiliate_conversions").update({ status: "approved" }).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-conversions"] });
      toast.success("Conversion approved");
    },
  });

  const processPayoutMut = useMutation({
    mutationFn: async (affiliateId: string) => {
      const aff = affiliates.find((a: any) => a.id === affiliateId);
      if (!aff) return;
      const unpaid = aff.total_earned - aff.total_paid;
      if (unpaid <= 0) { toast.error("No balance to pay"); return; }
      await (supabase as any).from("storefront_affiliate_payouts").insert({
        affiliate_id: affiliateId,
        shop_id: shopId,
        amount: unpaid,
        currency: aff.currency,
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      await (supabase as any).from("storefront_affiliates").update({ total_paid: aff.total_earned, updated_at: new Date().toISOString() }).eq("id", affiliateId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-affiliates"] });
      toast.success("Payout processed");
    },
  });

  const affiliateLink = myAffiliate ? `${window.location.origin}/s/${shopSlug}?ref=${myAffiliate.affiliate_code}` : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    toast.success("Affiliate link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // ======= BUYER VIEW =======
  if (mode === "buyer") {
    if (!myAffiliate) {
      return (
        <Card>
          <CardContent className="p-4 text-center space-y-3">
            <Award className="h-8 w-8 text-primary mx-auto" />
            <h3 className="text-sm font-bold">Affiliate Program</h3>
            <p className="text-xs text-muted-foreground">Earn commission on every sale you refer. Share your unique link and get paid!</p>
            <Button size="sm" className="text-xs" onClick={() => joinProgram.mutate()} disabled={joinProgram.isPending}>
              {joinProgram.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Join Program"}
            </Button>
          </CardContent>
        </Card>
      );
    }

    const unpaid = (myAffiliate.total_earned || 0) - (myAffiliate.total_paid || 0);

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> My Affiliate Dashboard</h3>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Clicks", value: myAffiliate.total_clicks || 0, icon: TrendingUp },
            { label: "Sales", value: myAffiliate.total_conversions || 0, icon: Users },
            { label: "Earned", value: `${(myAffiliate.total_earned || 0).toFixed(0)}`, icon: DollarSign },
            { label: "Unpaid", value: `${unpaid.toFixed(0)}`, icon: CreditCard },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-2 text-center">
                <s.icon className="h-3 w-3 text-primary mx-auto mb-1" />
                <p className="text-sm font-bold">{s.value}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Link */}
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Your affiliate link ({myAffiliate.commission_rate}% commission)</p>
            <div className="flex gap-2">
              <Input value={affiliateLink} readOnly className="h-8 text-[10px] font-mono" />
              <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={copyLink}>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent conversions */}
        {myConversions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold mb-1">Recent Conversions</h4>
            {myConversions.slice(0, 5).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                <span className="text-[10px] font-medium">+{c.commission_amount} {c.currency}</span>
                <Badge variant={c.status === "paid" ? "default" : "secondary"} className="text-[9px]">{c.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ======= SELLER VIEW =======
  const totalRevenue = affiliates.reduce((s: number, a: any) => s + (a.total_revenue || 0), 0);
  const totalCommissions = affiliates.reduce((s: number, a: any) => s + (a.total_earned || 0), 0);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> Affiliate Program</h3>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-2 text-center"><p className="text-sm font-bold">{affiliates.length}</p><p className="text-[9px] text-muted-foreground">Affiliates</p></CardContent></Card>
        <Card><CardContent className="p-2 text-center"><p className="text-sm font-bold">{totalRevenue.toFixed(0)}</p><p className="text-[9px] text-muted-foreground">Revenue</p></CardContent></Card>
        <Card><CardContent className="p-2 text-center"><p className="text-sm font-bold">{totalCommissions.toFixed(0)}</p><p className="text-[9px] text-muted-foreground">Commissions</p></CardContent></Card>
      </div>

      {/* Affiliates list */}
      {affiliates.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-muted-foreground text-xs">No affiliates yet. Share your shop to attract affiliates!</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {affiliates.map((a: any) => {
            const unpaid = (a.total_earned || 0) - (a.total_paid || 0);
            return (
              <Card key={a.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-xs font-semibold font-mono">{a.affiliate_code}</p>
                      <p className="text-[10px] text-muted-foreground">{a.commission_rate}% · {a.total_clicks} clicks · {a.total_conversions} sales</p>
                    </div>
                    <Badge variant={a.status === "active" ? "default" : "secondary"} className="text-[9px]">{a.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">Earned: {a.total_earned?.toFixed(2)} · Unpaid: {unpaid.toFixed(2)}</span>
                    {unpaid > 0 && (
                      <Button size="sm" variant="outline" className="text-[10px] h-6" onClick={() => processPayoutMut.mutate(a.id)} disabled={processPayoutMut.isPending}>
                        Pay {unpaid.toFixed(0)}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recent conversions */}
      {conversions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold mb-2">Recent Conversions</h4>
          <div className="space-y-1">
            {conversions.slice(0, 10).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div>
                  <span className="text-[10px] font-mono">{c.storefront_affiliates?.affiliate_code || "—"}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]">{c.order_total} → {c.commission_amount}</span>
                  <Badge variant={c.status === "approved" ? "default" : "secondary"} className="text-[9px]">{c.status}</Badge>
                  {c.status === "pending" && (
                    <Button size="sm" variant="ghost" className="text-[9px] h-5" onClick={() => approveConversion.mutate(c.id)}>✓</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
