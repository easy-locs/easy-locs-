/**
 * TaxComplianceEngine — Per-country tax rules, VAT auto-calc, invoice compliance
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Scale, Plus, Trash2, Loader2, Globe, Percent, FileText } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode?: "seller" | "buyer";
}

const DEFAULT_TAX_RATES: Record<string, { name: string; rate: number }> = {
  FR: { name: "TVA", rate: 20 },
  DE: { name: "MwSt", rate: 19 },
  ES: { name: "IVA", rate: 21 },
  IT: { name: "IVA", rate: 22 },
  PT: { name: "IVA", rate: 23 },
  BE: { name: "BTW/TVA", rate: 21 },
  NL: { name: "BTW", rate: 21 },
  GB: { name: "VAT", rate: 20 },
  US: { name: "Sales Tax", rate: 0 },
  CH: { name: "MWST", rate: 7.7 },
  MA: { name: "TVA", rate: 20 },
  SN: { name: "TVA", rate: 18 },
  CI: { name: "TVA", rate: 18 },
};

export default function TaxComplianceEngine({ shopId, mode = "seller" }: Props) {
  const qc = useQueryClient();
  const [newRule, setNewRule] = useState({ country: "", rate: "", name: "" });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["tax-rules", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_tax_rules")
        .select("*")
        .eq("shop_id", shopId)
        .order("country_code");
      return data || [];
    },
  });

  const createRule = useMutation({
    mutationFn: async () => {
      const cc = newRule.country.toUpperCase();
      const defaults = DEFAULT_TAX_RATES[cc];
      await (supabase as any).from("storefront_tax_rules").insert({
        shop_id: shopId,
        country_code: cc,
        tax_name: newRule.name || defaults?.name || "VAT",
        rate_percent: parseFloat(newRule.rate) || defaults?.rate || 20,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-rules"] });
      setNewRule({ country: "", rate: "", name: "" });
      toast.success("Tax rule added");
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from("storefront_tax_rules").delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-rules"] }); toast.success("Rule deleted"); },
  });

  const addDefaults = useMutation({
    mutationFn: async () => {
      const existingCodes = rules.map((r: any) => r.country_code);
      const toAdd = Object.entries(DEFAULT_TAX_RATES)
        .filter(([code]) => !existingCodes.includes(code))
        .map(([code, info]) => ({
          shop_id: shopId,
          country_code: code,
          tax_name: info.name,
          rate_percent: info.rate,
        }));
      if (toAdd.length) {
        await (supabase as any).from("storefront_tax_rules").insert(toAdd);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-rules"] }); toast.success("Default rates added"); },
  });

  // Tax calculator
  const [calcAmount, setCalcAmount] = useState("");
  const [calcCountry, setCalcCountry] = useState("FR");
  const matchingRule = rules.find((r: any) => r.country_code === calcCountry);
  const taxRate = matchingRule?.rate_percent ?? DEFAULT_TAX_RATES[calcCountry]?.rate ?? 20;
  const calcBase = parseFloat(calcAmount) || 0;
  const taxAmount = calcBase * (taxRate / 100);

  if (mode === "buyer") return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            Tax & Compliance
          </h3>
          <Badge variant="outline" className="text-2xs">{rules.length} rules</Badge>
        </div>

        {/* Quick add defaults */}
        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => addDefaults.mutate()} disabled={addDefaults.isPending}>
          <Globe className="w-3 h-3 mr-1" /> Add Default EU/Africa Rates
        </Button>

        {/* Add custom rule */}
        <div className="flex gap-2">
          <Input value={newRule.country} onChange={e => setNewRule(p => ({ ...p, country: e.target.value }))} placeholder="FR" className="w-16 h-8 text-xs uppercase" maxLength={2} />
          <Input value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} placeholder="TVA" className="w-20 h-8 text-xs" />
          <Input type="number" value={newRule.rate} onChange={e => setNewRule(p => ({ ...p, rate: e.target.value }))} placeholder="20" className="w-16 h-8 text-xs" />
          <Button size="sm" className="h-8 text-xs" onClick={() => createRule.mutate()} disabled={!newRule.country || createRule.isPending}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        {/* Rules list */}
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {rules.map((rule: any) => (
              <div key={rule.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold">{rule.country_code}</span>
                  <span className="text-2xs text-muted-foreground">{rule.tax_name}</span>
                  <Badge variant="secondary" className="text-2xs">{rule.rate_percent}%</Badge>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteRule.mutate(rule.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Tax calculator */}
        <div className="border-t border-border pt-3 space-y-2">
          <h4 className="text-xs font-semibold flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5" /> Tax Calculator
          </h4>
          <div className="flex gap-2 items-center">
            <Input type="number" value={calcAmount} onChange={e => setCalcAmount(e.target.value)} placeholder="Amount" className="flex-1 h-8 text-xs" />
            <select
              value={calcCountry}
              onChange={e => setCalcCountry(e.target.value)}
              className="h-8 rounded-md border border-border bg-card text-xs px-2"
            >
              {[...new Set([...Object.keys(DEFAULT_TAX_RATES), ...rules.map((r: any) => r.country_code)])].sort().map(cc => (
                <option key={cc} value={cc}>{cc}</option>
              ))}
            </select>
          </div>
          {calcBase > 0 && (
            <div className="bg-muted/30 rounded-lg p-2.5 text-xs space-y-1">
              <div className="flex justify-between"><span>HT (excl. tax)</span><span className="font-semibold">{calcBase.toFixed(2)}€</span></div>
              <div className="flex justify-between"><span>{matchingRule?.tax_name || "VAT"} ({taxRate}%)</span><span>{taxAmount.toFixed(2)}€</span></div>
              <div className="flex justify-between border-t border-border pt-1"><span className="font-bold">TTC (incl. tax)</span><span className="font-black">{(calcBase + taxAmount).toFixed(2)}€</span></div>
            </div>
          )}
        </div>

        {/* Invoice compliance note */}
        <div className="bg-primary/5 rounded-xl p-3 flex items-start gap-2">
          <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="text-2xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-0.5">Invoice Compliance</p>
            <p>Invoices auto-include: sequential number (INV-YYYYMM-XXXX), tax breakdown by country, seller VAT ID, and buyer details per EU regulation.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
