/**
 * AdvancedReferralSystem — Multi-tier referral links, commissions, dashboard
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, Copy, Check, Users, DollarSign, TrendingUp, Loader2, Trash2, Eye, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  shopSlug?: string;
  mode?: "buyer" | "seller";
}

export default function AdvancedReferralSystem({ shopId, shopSlug, mode = "buyer" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const [commissionRate, setCommissionRate] = useState("5");

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["referral-links", shopId, user?.id, mode],
    queryFn: async () => {
      const q = (supabase as any).from("storefront_referral_links").select("*");
      if (mode === "seller") q.eq("shop_id", shopId);
      else q.eq("referrer_id", user!.id).eq("shop_id", shopId);
      const { data } = await q.order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: conversions = [] } = useQuery({
    queryKey: ["referral-conversions", shopId, user?.id],
    queryFn: async () => {
      const linkIds = links.map((l: any) => l.id);
      if (!linkIds.length) return [];
      const { data } = await (supabase as any)
        .from("storefront_referral_conversions")
        .select("*")
        .in("link_id", linkIds)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: links.length > 0,
  });

  const createLink = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_referral_links").insert({
        shop_id: shopId,
        referrer_id: user!.id,
        commission_percent: parseFloat(commissionRate) || 5,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["referral-links"] }); toast.success("Referral link created"); },
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from("storefront_referral_links").delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["referral-links"] }); toast.success("Link deleted"); },
  });

  const copyLink = async (code: string) => {
    const url = `${window.location.origin}/s/${shopSlug || shopId}?ref=${code}`;
    await navigator.clipboard.writeText(url);
    setCopied(code);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  const totalEarned = links.reduce((sum: number, l: any) => sum + (l.total_earned || 0), 0);
  const totalClicks = links.reduce((sum: number, l: any) => sum + (l.clicks || 0), 0);
  const totalConversions = links.reduce((sum: number, l: any) => sum + (l.conversions || 0), 0);

  if (!user) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            {mode === "seller" ? "Referral Program" : "My Referrals"}
          </h3>
          <Badge variant="outline" className="text-2xs">{links.length} links</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/30 rounded-xl p-2.5 text-center">
            <Eye className="w-4 h-4 mx-auto mb-1 text-info" />
            <p className="text-lg font-black">{totalClicks}</p>
            <p className="text-2xs text-muted-foreground">Clicks</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-2.5 text-center">
            <ShoppingCart className="w-4 h-4 mx-auto mb-1 text-success" />
            <p className="text-lg font-black">{totalConversions}</p>
            <p className="text-2xs text-muted-foreground">Conversions</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-2.5 text-center">
            <DollarSign className="w-4 h-4 mx-auto mb-1 text-warning" />
            <p className="text-lg font-black">{totalEarned.toFixed(0)}€</p>
            <p className="text-2xs text-muted-foreground">Earned</p>
          </div>
        </div>

        {/* Create link */}
        <div className="flex gap-2">
          {mode === "seller" && (
            <Input
              type="number"
              value={commissionRate}
              onChange={e => setCommissionRate(e.target.value)}
              placeholder="Commission %"
              className="w-24 h-8 text-xs"
              min="1"
              max="50"
            />
          )}
          <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => createLink.mutate()} disabled={createLink.isPending}>
            <Link className="w-3 h-3 mr-1" /> Generate Link
          </Button>
        </div>

        {/* Links */}
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {links.map((link: any) => (
              <div key={link.id} className="border border-border rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-primary">{link.code}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyLink(link.code)}>
                      {copied === link.code ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteLink.mutate(link.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-2xs text-muted-foreground">
                  <span>{link.commission_percent}% commission</span>
                  <span>Tier {link.tier}</span>
                  <span>{link.clicks} clicks</span>
                  <span>{link.conversions} conv.</span>
                  <span className="text-success font-semibold">{(link.total_earned || 0).toFixed(2)}€</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent conversions */}
        {conversions.length > 0 && (
          <div className="border-t border-border pt-3 space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Recent Conversions
            </h4>
            {conversions.slice(0, 5).map((conv: any) => (
              <div key={conv.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-2 text-xs">
                <span className="text-muted-foreground">{new Date(conv.created_at).toLocaleDateString()}</span>
                <span>Order: {(conv.order_amount || 0).toFixed(2)}€</span>
                <Badge className={conv.status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"} variant="secondary">
                  +{(conv.commission_amount || 0).toFixed(2)}€
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
