/**
 * MultiCurrencyTax — Seller: configure tax rules per country.
 * Auto-calculates VAT, generates compliant invoices, multi-currency display.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Receipt, Globe, Plus, Percent, FileText, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
}

const COMMON_COUNTRIES = [
  { code: "FR", name: "France", defaultRate: 20 },
  { code: "DE", name: "Germany", defaultRate: 19 },
  { code: "ES", name: "Spain", defaultRate: 21 },
  { code: "IT", name: "Italy", defaultRate: 22 },
  { code: "GB", name: "United Kingdom", defaultRate: 20 },
  { code: "US", name: "United States", defaultRate: 0 },
  { code: "CA", name: "Canada", defaultRate: 5 },
  { code: "MA", name: "Morocco", defaultRate: 20 },
  { code: "AE", name: "UAE", defaultRate: 5 },
  { code: "JP", name: "Japan", defaultRate: 10 },
  { code: "BR", name: "Brazil", defaultRate: 17 },
  { code: "TR", name: "Turkey", defaultRate: 20 },
];

export default function MultiCurrencyTax({ shopId, mode }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ country: "FR", tax_name: "VAT", tax_rate: "20", tax_inclusive: true, applies_to: "all" });

  // Tax rules
  const { data: rules = [] } = useQuery({
    queryKey: ["tax-rules", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_tax_rules").select("*").eq("shop_id", shopId).order("country");
      return data || [];
    },
    enabled: mode === "seller",
  });

  // Invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_invoices").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const addRule = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_tax_rules").insert({
        shop_id: shopId,
        user_id: user!.id,
        country: form.country,
        tax_name: form.tax_name,
        tax_rate: parseFloat(form.tax_rate),
        tax_inclusive: form.tax_inclusive,
        applies_to: form.applies_to,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-rules"] });
      setShowForm(false);
      toast.success("Tax rule added");
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from("storefront_tax_rules").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-rules"] });
      toast.success("Tax rule removed");
    },
  });

  const handleCountrySelect = (code: string) => {
    const c = COMMON_COUNTRIES.find(c => c.code === code);
    setForm(f => ({
      ...f,
      country: code,
      tax_rate: c ? String(c.defaultRate) : f.tax_rate,
      tax_name: code === "US" || code === "CA" ? "Sales Tax" : "VAT",
    }));
  };

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          {mode === "seller" ? "Tax & Currency" : "Invoices"}
        </h3>
        {mode === "seller" && (
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3 w-3" /> Tax Rule
          </Button>
        )}
      </div>

      {/* Seller: Tax Rules */}
      {mode === "seller" && (
        <>
          {showForm && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Country</Label>
                    <Select value={form.country} onValueChange={handleCountrySelect}>
                      <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COMMON_COUNTRIES.map(c => (
                          <SelectItem key={c.code} value={c.code} className="text-xs">{c.name} ({c.defaultRate}%)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Tax Name</Label>
                    <Input value={form.tax_name} onChange={e => setForm(f => ({ ...f, tax_name: e.target.value }))} className="mt-0.5 h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <Label className="text-[10px]">Rate %</Label>
                    <Input type="number" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} className="mt-0.5 h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Applies To</Label>
                    <Select value={form.applies_to} onValueChange={v => setForm(f => ({ ...f, applies_to: v }))}>
                      <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">All</SelectItem>
                        <SelectItem value="physical" className="text-xs">Physical</SelectItem>
                        <SelectItem value="digital" className="text-xs">Digital</SelectItem>
                        <SelectItem value="services" className="text-xs">Services</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.tax_inclusive} onCheckedChange={v => setForm(f => ({ ...f, tax_inclusive: v }))} />
                    <Label className="text-[10px]">Inclusive</Label>
                  </div>
                </div>
                <Button size="sm" className="w-full text-xs" onClick={() => addRule.mutate()} disabled={addRule.isPending}>
                  {addRule.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add Tax Rule"}
                </Button>
              </CardContent>
            </Card>
          )}

          {rules.length > 0 && (
            <div className="grid gap-2">
              {rules.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Percent className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{r.country} — {r.tax_name} {r.tax_rate}%</p>
                        <p className="text-[10px] text-muted-foreground">{r.tax_inclusive ? "Inclusive" : "Exclusive"} · {r.applies_to}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-[10px] text-destructive" onClick={() => deleteRule.mutate(r.id)}>Remove</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Invoices */}
      <div>
        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1"><FileText className="h-3 w-3" /> Invoices</h4>
        {invoices.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-muted-foreground text-xs">No invoices yet</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv: any) => (
              <Card key={inv.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold font-mono">{inv.invoice_number}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {inv.buyer_name || "—"} · {inv.total} {inv.currency}
                      {inv.display_currency && inv.display_currency !== inv.currency && ` (≈ ${(inv.total * (inv.exchange_rate || 1)).toFixed(2)} ${inv.display_currency})`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{inv.tax_name}: {inv.tax_amount} ({inv.tax_rate}%)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="text-[9px]">{inv.status}</Badge>
                    <Button size="icon" variant="ghost" className="h-6 w-6">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
