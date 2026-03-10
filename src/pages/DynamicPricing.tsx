import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Zap, TrendingUp, Calendar, Percent, Plus, Trash2, BarChart3, ArrowLeft } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const RULE_TYPES = [
  { value: "seasonal", label: "Seasonal", desc: "High/low season", icon: "☀️" },
  { value: "weekend", label: "Weekend", desc: "Saturday/Sunday surcharge", icon: "📅" },
  { value: "event", label: "Event", desc: "Festivals, conferences, concerts", icon: "🎉" },
  { value: "occupancy", label: "Occupancy rate", desc: "Dynamic pricing based on occupancy", icon: "📊" },
  { value: "last_minute", label: "Last minute", desc: "Discount D-3 / D-7", icon: "⏰" },
];

const DynamicPricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    rule_type: "seasonal", name: "", adjustment_type: "percentage", adjustment_value: "",
    start_date: "", end_date: "", property_id: "",
  });

  const { data: org } = useQuery({
    queryKey: ["org", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("org_members").select("org_id").eq("user_id", user!.id).limit(1).single();
      if (!data) return null;
      const { data: o } = await supabase.from("orgs").select("*").eq("id", data.org_id).single();
      return o;
    },
    enabled: !!user,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id, label, monthly_rent").eq("org_id", org!.id).eq("rental_mode", "seasonal");
      return data || [];
    },
    enabled: !!org,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["pricing_rules", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("pricing_rules" as any).select("*").eq("org_id", org!.id).order("priority", { ascending: false });
      return (data || []) as unknown as Array<{
        id: string; name: string; rule_type: string; adjustment_type: string;
        adjustment_value: number; start_date: string | null; end_date: string | null;
        active: boolean; property_id: string; priority: number;
      }>;
    },
    enabled: !!org,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["listings", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("public_listings").select("id, property_id, price_per_night, title").eq("org_id", org!.id);
      return data || [];
    },
    enabled: !!org,
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reservations" as any).select("*").eq("org_id", org!.id);
      return (data || []) as unknown as Array<{ property_id: string; check_in: string; check_out: string; amount: number }>;
    },
    enabled: !!org,
  });

  // Occupancy rates per property
  const occupancyData = useMemo(() => {
    return properties.map(p => {
      const propRes = reservations.filter(r => r.property_id === p.id);
      const totalNights = propRes.reduce((s, r) => {
        try { return s + differenceInDays(parseISO(r.check_out), parseISO(r.check_in)); } catch { return s; }
      }, 0);
      const daysInYear = 365;
      const occupancy = Math.min(100, Math.round((totalNights / daysInYear) * 100));
      const listing = listings.find(l => l.property_id === p.id);
      const basePrice = listing?.price_per_night || 0;
      const activeRules = rules.filter(r => r.property_id === p.id && r.active);
      const totalAdjustment = activeRules.reduce((s, r) =>
        s + (r.adjustment_type === "percentage" ? basePrice * (r.adjustment_value / 100) : r.adjustment_value), 0);
      return {
        property: p.label,
        occupancy,
        basePrice,
        suggestedPrice: Math.round(basePrice + totalAdjustment),
        rulesCount: activeRules.length,
        revenue: propRes.reduce((s, r) => s + Number(r.amount || 0), 0),
      };
    });
  }, [properties, reservations, rules, listings]);

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pricing_rules" as any).insert({
        org_id: org!.id, user_id: user!.id,
        rule_type: newRule.rule_type, name: newRule.name,
        adjustment_type: newRule.adjustment_type,
        adjustment_value: Number(newRule.adjustment_value) || 0,
        start_date: newRule.start_date || null, end_date: newRule.end_date || null,
        property_id: newRule.property_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pricing rule added");
      qc.invalidateQueries({ queryKey: ["pricing_rules"] });
      setAddOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("pricing_rules" as any).update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing_rules"] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pricing_rules" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule deleted");
      qc.invalidateQueries({ queryKey: ["pricing_rules"] });
    },
  });

  const avgOccupancy = occupancyData.length > 0
    ? Math.round(occupancyData.reduce((s, d) => s + d.occupancy, 0) / occupancyData.length)
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => navigate("/dashboard/channel-manager")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold text-foreground">Dynamic Pricing</h1>
            </div>
            <p className="text-muted-foreground text-sm ml-10">Optimize your prices based on demand and seasonality</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New rule</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add a pricing rule</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Rule name" value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} />
                <Select value={newRule.rule_type} onValueChange={v => setNewRule(p => ({ ...p, rule_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RULE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.icon} {r.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={newRule.property_id} onValueChange={v => setNewRule(p => ({ ...p, property_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un bien" /></SelectTrigger>
                  <SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={newRule.adjustment_type} onValueChange={v => setNewRule(p => ({ ...p, adjustment_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                      <SelectItem value="fixed">Montant fixe (€)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder={newRule.adjustment_type === "percentage" ? "+15%" : "+20€"} value={newRule.adjustment_value} onChange={e => setNewRule(p => ({ ...p, adjustment_value: e.target.value }))} />
                </div>
                {(newRule.rule_type === "seasonal" || newRule.rule_type === "event") && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="date" value={newRule.start_date} onChange={e => setNewRule(p => ({ ...p, start_date: e.target.value }))} />
                    <Input type="date" value={newRule.end_date} onChange={e => setNewRule(p => ({ ...p, end_date: e.target.value }))} />
                  </div>
                )}
                <Button className="w-full" onClick={() => addMut.mutate()} disabled={!newRule.name || !newRule.property_id || addMut.isPending}>
                  {addMut.isPending ? "Ajout..." : "Créer la règle"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">Règles actives</span></div>
            <p className="text-2xl font-bold text-foreground">{rules.filter(r => r.active).length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">Taux d'occupation</span></div>
            <p className="text-2xl font-bold text-foreground">{avgOccupancy}%</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-foreground" /><span className="text-xs text-muted-foreground uppercase">Biens saisonniers</span></div>
            <p className="text-2xl font-bold text-foreground">{properties.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">Revenus saisonniers</span></div>
            <p className="text-2xl font-bold text-accent">{occupancyData.reduce((s, d) => s + d.revenue, 0).toLocaleString()} €</p>
          </CardContent></Card>
        </div>

        {/* Occupancy chart */}
        {occupancyData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Taux d'occupation & prix suggéré</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={occupancyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="property" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="occupancy" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Occupation (%)" />
                  <Bar dataKey="suggestedPrice" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Prix suggéré (€)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Pricing recommendations */}
        <Card>
          <CardHeader><CardTitle className="text-lg">💡 Recommandations de prix</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {occupancyData.map(d => (
                <div key={d.property} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{d.property}</p>
                    <p className="text-xs text-muted-foreground">Occupation : {d.occupancy}% — {d.rulesCount} règle(s) active(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground line-through">{d.basePrice} €/nuit</p>
                    <p className="text-lg font-bold text-accent">{d.suggestedPrice} €/nuit</p>
                  </div>
                </div>
              ))}
              {occupancyData.length === 0 && <p className="text-center text-muted-foreground py-4">Ajoutez des biens saisonniers pour voir les recommandations</p>}
            </div>
          </CardContent>
        </Card>

        {/* Rules list */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Règles de tarification</CardTitle></CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">Aucune règle configurée</p>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => {
                  const rt = RULE_TYPES.find(r => r.value === rule.rule_type);
                  return (
                    <div key={rule.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{rt?.icon || "📌"}</span>
                        <div>
                          <p className="font-medium text-foreground">{rule.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {rt?.label} — {rule.adjustment_type === "percentage" ? `${rule.adjustment_value > 0 ? "+" : ""}${rule.adjustment_value}%` : `${rule.adjustment_value > 0 ? "+" : ""}${rule.adjustment_value}€`}
                            {rule.start_date && ` — ${rule.start_date} → ${rule.end_date}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={rule.active} onCheckedChange={v => toggleMut.mutate({ id: rule.id, active: v })} />
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMut.mutate(rule.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DynamicPricing;
