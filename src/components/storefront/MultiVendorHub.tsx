/**
 * MultiVendorHub — ORBIT V1: Multi-vendor marketplace management.
 * Seller: manage vendors, commissions, approve/reject, payouts.
 * Buyer: browse vendors.
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
import { Users, Plus, CheckCircle2, XCircle, DollarSign, Loader2, Store, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface Props { shopId: string; mode?: "seller" | "vendor"; }

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function MultiVendorHub({ shopId, mode = "seller" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [applying, setApplying] = useState(false);
  const [form, setForm] = useState({ display_name: "", email: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<Record<string, string>>({});

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-hub", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_vendors")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["vendor-payouts", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_vendor_payouts")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: mode === "seller",
  });

  const myVendor = vendors.find((v: any) => v.vendor_user_id === user?.id);

  const applyAsVendor = async () => {
    if (!user || !form.display_name) return;
    setSaving(true);
    try {
      await (supabase as any).from("storefront_vendors").insert({
        shop_id: shopId, vendor_user_id: user.id,
        display_name: form.display_name, email: form.email || null, bio: form.bio || null,
      });
      qc.invalidateQueries({ queryKey: ["vendors-hub", shopId] });
      setApplying(false);
      toast.success("Application submitted!");
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const updateVendorStatus = async (vendorId: string, status: string) => {
    await (supabase as any).from("storefront_vendors").update({
      status, approved_at: status === "approved" ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
    }).eq("id", vendorId);
    qc.invalidateQueries({ queryKey: ["vendors-hub", shopId] });
    toast.success(`Vendor ${status}`);
  };

  const createPayout = async (vendorId: string) => {
    const amt = parseFloat(payoutAmount[vendorId] || "0");
    if (!amt || amt <= 0) return;
    await (supabase as any).from("storefront_vendor_payouts").insert({
      vendor_id: vendorId, shop_id: shopId, amount: amt,
    });
    await (supabase as any).from("storefront_vendors").update({
      payout_balance: 0, updated_at: new Date().toISOString(),
    }).eq("id", vendorId);
    qc.invalidateQueries({ queryKey: ["vendors-hub", shopId] });
    qc.invalidateQueries({ queryKey: ["vendor-payouts", shopId] });
    setPayoutAmount(prev => ({ ...prev, [vendorId]: "" }));
    toast.success("Payout created");
  };

  if (mode === "vendor") {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Store className="h-4 w-4 text-primary" /> Vendor Program
        </h3>

        {myVendor ? (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold">{myVendor.display_name}</h4>
                <Badge variant={myVendor.status === "approved" ? "default" : "secondary"} className="text-[10px]">
                  {myVendor.status}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{fmtPrice(myVendor.total_sales || 0)}</p>
                  <p className="text-[10px] text-muted-foreground">Total Sales</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{fmtPrice(myVendor.total_commission || 0)}</p>
                  <p className="text-[10px] text-muted-foreground">Commission</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">{fmtPrice(myVendor.payout_balance || 0)}</p>
                  <p className="text-[10px] text-muted-foreground">Balance</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Commission rate: {myVendor.commission_rate}%</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {!applying ? (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setApplying(true)}>
                <Plus className="h-3 w-3" /> Apply as Vendor
              </Button>
            ) : (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <Label className="text-xs">Display Name</Label>
                    <Input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Bio</Label>
                    <Textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className="mt-1" rows={2} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={applyAsVendor} disabled={saving}>
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Submit Application"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setApplying(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    );
  }

  // Seller mode
  const pending = vendors.filter((v: any) => v.status === "pending");
  const approved = vendors.filter((v: any) => v.status === "approved");
  const totalSales = vendors.reduce((s: number, v: any) => s + (v.total_sales || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Multi-vendor Hub
        </h3>
        <Badge variant="outline" className="text-[10px]">{approved.length} vendors</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Vendors", value: approved.length, icon: Store },
          { label: "Pending", value: pending.length, icon: Users },
          { label: "Total Sales", value: fmtPrice(totalSales), icon: TrendingUp },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <s.icon className="h-4 w-4 mx-auto text-primary mb-1" />
              <p className="text-sm font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-warning">Pending Approvals</p>
          {pending.map((v: any) => (
            <Card key={v.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{v.display_name}</p>
                  <p className="text-[10px] text-muted-foreground">{v.email}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => updateVendorStatus(v.id, "approved")}>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => updateVendorStatus(v.id, "rejected")}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Active vendors */}
      {approved.map((v: any) => (
        <Card key={v.id}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{v.display_name}</p>
                <p className="text-[10px] text-muted-foreground">{v.commission_rate}% commission · Sales: {fmtPrice(v.total_sales || 0)}</p>
              </div>
              <Badge className="text-[10px]">Active</Badge>
            </div>
            {(v.payout_balance || 0) > 0 && (
              <div className="flex items-center gap-2">
                <Input
                  type="number" placeholder="Payout amount" className="h-7 text-xs flex-1"
                  value={payoutAmount[v.id] || ""}
                  onChange={e => setPayoutAmount(prev => ({ ...prev, [v.id]: e.target.value }))}
                />
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => createPayout(v.id)}>
                  <DollarSign className="h-3 w-3" /> Pay
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
