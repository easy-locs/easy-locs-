/**
 * AffiliateReferralProgram — Affiliate links, multi-level commissions, conversion tracking, dashboard.
 * Props: shopId, shopSlug, mode ("seller" | "buyer")
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, Copy, Check, TrendingUp, Users, DollarSign, BarChart3, Gift, Percent } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  shopSlug?: string;
  mode?: "seller" | "buyer";
}

export default function AffiliateReferralProgram({ shopId, shopSlug, mode = "buyer" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Load affiliate program config
  const { data: program } = useQuery({
    queryKey: ["affiliate-program-config", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_affiliate_programs")
        .select("*")
        .eq("shop_id", shopId)
        .maybeSingle();
      return data;
    },
    enabled: !!shopId,
  });

  // Load user's affiliate record
  const { data: myAffiliate } = useQuery({
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
    enabled: !!shopId && !!user && mode === "buyer",
  });

  // Load conversions for affiliate
  const { data: conversions = [] } = useQuery({
    queryKey: ["affiliate-conversions", myAffiliate?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_affiliate_conversions")
        .select("*")
        .eq("affiliate_id", myAffiliate!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!myAffiliate?.id,
  });

  // Load all affiliates (seller view)
  const { data: allAffiliates = [] } = useQuery({
    queryKey: ["all-affiliates", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_affiliates")
        .select("*")
        .eq("shop_id", shopId)
        .order("total_earned", { ascending: false });
      return data || [];
    },
    enabled: !!shopId && mode === "seller",
  });

  const joinProgram = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const code = `REF-${user.id.substring(0, 8).toUpperCase()}`;
      const { error } = await (supabase as any).from("storefront_affiliates").insert({
        shop_id: shopId,
        user_id: user.id,
        referral_code: code,
        commission_rate: program?.default_commission_rate || 10,
        status: "active",
        total_earned: 0,
        total_clicks: 0,
        total_conversions: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Welcome to the affiliate program! 🎉");
      qc.invalidateQueries({ queryKey: ["my-affiliate", shopId, user?.id] });
    },
  });

  const setupProgram = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Auth required");
      const { error } = await (supabase as any).from("storefront_affiliate_programs").upsert({
        shop_id: shopId,
        default_commission_rate: 10,
        cookie_days: 30,
        min_payout: 50,
        enabled: true,
      }, { onConflict: "shop_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Affiliate program enabled!");
      qc.invalidateQueries({ queryKey: ["affiliate-program-config", shopId] });
    },
  });

  const affiliateLink = myAffiliate
    ? `${window.location.origin}/s/${shopSlug}?ref=${myAffiliate.referral_code}`
    : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    toast.success("Affiliate link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const totalEarned = myAffiliate?.total_earned || 0;
  const totalClicks = myAffiliate?.total_clicks || 0;
  const totalConversions = myAffiliate?.total_conversions || 0;
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0.0";

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" /> Affiliate Program
          </h3>
          {program?.enabled && <Badge className="bg-green-500/10 text-green-600 text-[9px]">Active</Badge>}
        </div>

        {mode === "seller" ? (
          <div className="space-y-4">
            {!program?.enabled ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-3">Enable affiliate program to let others promote your shop</p>
                <Button size="sm" className="text-xs" onClick={() => setupProgram.mutate()}>
                  <Percent className="h-3 w-3 mr-1" /> Enable Affiliate Program
                </Button>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/30 rounded-lg p-2 text-center">
                    <Users className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">{allAffiliates.length}</p>
                    <p className="text-[9px] text-muted-foreground">Affiliates</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2 text-center">
                    <TrendingUp className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">{allAffiliates.reduce((s: number, a: any) => s + (a.total_conversions || 0), 0)}</p>
                    <p className="text-[9px] text-muted-foreground">Conversions</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2 text-center">
                    <DollarSign className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">{allAffiliates.reduce((s: number, a: any) => s + (a.total_earned || 0), 0).toFixed(0)}</p>
                    <p className="text-[9px] text-muted-foreground">Paid Out</p>
                  </div>
                </div>

                {/* Top affiliates */}
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground">Top Affiliates</p>
                  {allAffiliates.slice(0, 5).map((a: any, i: number) => (
                    <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {i + 1}
                        </span>
                        <span className="font-medium">{a.referral_code}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{a.total_conversions || 0} conv.</span>
                        <span className="font-bold text-foreground">{(a.total_earned || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {!program?.enabled ? (
              <p className="text-xs text-muted-foreground text-center py-4">No affiliate program available</p>
            ) : !myAffiliate ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Earn {program.default_commission_rate || 10}% commission on every sale you refer!
                </p>
                <Button size="sm" className="text-xs" onClick={() => joinProgram.mutate()} disabled={joinProgram.isPending}>
                  <Link className="h-3 w-3 mr-1" /> Join Affiliate Program
                </Button>
              </div>
            ) : (
              <>
                {/* Affiliate link */}
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <p className="text-[10px] font-medium">Your Affiliate Link</p>
                  <div className="flex gap-2">
                    <Input value={affiliateLink} readOnly className="text-[10px] h-8 font-mono" />
                    <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={copyLink}>
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground">
                    Commission: {myAffiliate.commission_rate}% · Cookie: {program.cookie_days || 30} days
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Clicks", value: totalClicks, icon: BarChart3 },
                    { label: "Conversions", value: totalConversions, icon: TrendingUp },
                    { label: "Rate", value: `${conversionRate}%`, icon: Percent },
                    { label: "Earned", value: `$${totalEarned.toFixed(0)}`, icon: DollarSign },
                  ].map(s => (
                    <div key={s.label} className="bg-muted/30 rounded-lg p-2 text-center">
                      <s.icon className="h-3 w-3 mx-auto text-muted-foreground mb-0.5" />
                      <p className="text-sm font-bold">{s.value}</p>
                      <p className="text-[8px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Recent conversions */}
                {conversions.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground">Recent Conversions</p>
                    {conversions.slice(0, 5).map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-[10px]">
                        <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                        <span className="font-bold text-green-600">+{(c.commission_amount || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
