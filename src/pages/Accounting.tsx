import { useState, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BookOpen, TrendingUp, TrendingDown, DollarSign, Download, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const CATEGORIES = [
  { value: "rent", label: "Loyer" },
  { value: "charges", label: "Charges" },
  { value: "deposit", label: "Dépôt de garantie" },
  { value: "booking", label: "Location saisonnière" },
  { value: "maintenance", label: "Maintenance" },
  { value: "insurance", label: "Assurance" },
  { value: "tax", label: "Impôts & Taxes" },
  { value: "utilities", label: "Services (eau, gaz, électricité)" },
  { value: "management", label: "Frais de gestion" },
  { value: "other", label: "Autre" },
];

const Accounting = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [newEntry, setNewEntry] = useState({ label: "", category: "other", debit: "", credit: "", transaction_date: format(new Date(), "yyyy-MM-dd"), notes: "", property_id: "" });

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
      const { data } = await supabase.from("properties").select("id, label").eq("org_id", org!.id);
      return data || [];
    },
    enabled: !!org,
  });

  const { data: journal = [] } = useQuery({
    queryKey: ["journal", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("transaction_journal" as any).select("*").eq("org_id", org!.id).order("transaction_date", { ascending: false }).limit(500);
      return (data || []) as Array<{
        id: string; label: string; category: string; debit: number; credit: number;
        transaction_date: string; currency: string; notes: string; source_type: string;
        property_id: string | null; created_at: string;
      }>;
    },
    enabled: !!org,
  });

  // Also load rent_calls and expenses to show in unified view
  const { data: rentCalls = [] } = useQuery({
    queryKey: ["rent_calls", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rent_calls").select("*").eq("org_id", org!.id).eq("paid", true);
      return data || [];
    },
    enabled: !!org,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*").eq("org_id", org!.id);
      return data || [];
    },
    enabled: !!org,
  });

  // Unified transactions: journal + auto-generated from rent_calls + expenses
  const allTransactions = useMemo(() => {
    const manual = journal.map(j => ({
      id: j.id, date: j.transaction_date, label: j.label, category: j.category,
      debit: Number(j.debit), credit: Number(j.credit), source: "manual" as const, currency: j.currency,
    }));
    const rents = rentCalls.map((r: any) => ({
      id: `rc-${r.id}`, date: r.paid_date || r.month, label: `Loyer ${r.month}`,
      category: "rent", debit: 0, credit: Number(r.total_amount), source: "auto" as const, currency: "EUR",
    }));
    const exps = expenses.map((e: any) => ({
      id: `ex-${e.id}`, date: e.expense_date, label: e.label,
      category: e.category, debit: Number(e.amount), credit: 0, source: "auto" as const, currency: "EUR",
    }));
    const all = [...manual, ...rents, ...exps];
    all.sort((a, b) => b.date.localeCompare(a.date));
    return filterCat === "all" ? all : all.filter(t => t.category === filterCat);
  }, [journal, rentCalls, expenses, filterCat]);

  // KPIs
  const now = new Date();
  const thisMonth = allTransactions.filter(t => {
    try { return parseISO(t.date) >= startOfMonth(now) && parseISO(t.date) <= endOfMonth(now); } catch { return false; }
  });
  const totalCredits = thisMonth.reduce((s, t) => s + t.credit, 0);
  const totalDebits = thisMonth.reduce((s, t) => s + t.debit, 0);
  const netIncome = totalCredits - totalDebits;

  // Cashflow chart (last 6 months)
  const cashflowData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const m = subMonths(now, 5 - i);
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const mTx = allTransactions.filter(t => {
        try { const d = parseISO(t.date); return d >= mStart && d <= mEnd; } catch { return false; }
      });
      return {
        month: format(m, "MMM"),
        revenus: mTx.reduce((s, t) => s + t.credit, 0),
        depenses: mTx.reduce((s, t) => s + t.debit, 0),
        net: mTx.reduce((s, t) => s + t.credit - t.debit, 0),
      };
    });
  }, [allTransactions]);

  // Add entry
  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transaction_journal" as any).insert({
        org_id: org!.id, user_id: user!.id,
        label: newEntry.label, category: newEntry.category,
        debit: Number(newEntry.debit) || 0, credit: Number(newEntry.credit) || 0,
        transaction_date: newEntry.transaction_date, notes: newEntry.notes,
        property_id: newEntry.property_id || null, source_type: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Écriture ajoutée");
      qc.invalidateQueries({ queryKey: ["journal"] });
      setAddOpen(false);
      setNewEntry({ label: "", category: "other", debit: "", credit: "", transaction_date: format(new Date(), "yyyy-MM-dd"), notes: "", property_id: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // CSV export
  const exportCSV = () => {
    const headers = "Date,Libellé,Catégorie,Débit,Crédit,Source\n";
    const rows = allTransactions.map(t => `${t.date},"${t.label}",${t.category},${t.debit},${t.credit},${t.source}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `comptabilite-${format(now, "yyyy-MM")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Comptabilité</h1>
            <p className="text-muted-foreground text-sm">Journal des transactions, cashflow et rapports financiers</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nouvelle écriture</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouvelle écriture comptable</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Libellé" value={newEntry.label} onChange={e => setNewEntry(p => ({ ...p, label: e.target.value }))} />
                  <Select value={newEntry.category} onValueChange={v => setNewEntry(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" placeholder="Débit (€)" value={newEntry.debit} onChange={e => setNewEntry(p => ({ ...p, debit: e.target.value }))} />
                    <Input type="number" placeholder="Crédit (€)" value={newEntry.credit} onChange={e => setNewEntry(p => ({ ...p, credit: e.target.value }))} />
                  </div>
                  <Input type="date" value={newEntry.transaction_date} onChange={e => setNewEntry(p => ({ ...p, transaction_date: e.target.value }))} />
                  <Select value={newEntry.property_id || "none"} onValueChange={v => setNewEntry(p => ({ ...p, property_id: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Bien (optionnel)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Aucun —</SelectItem>
                      {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Notes" value={newEntry.notes} onChange={e => setNewEntry(p => ({ ...p, notes: e.target.value }))} />
                  <Button className="w-full" onClick={() => addMut.mutate()} disabled={!newEntry.label || addMut.isPending}>
                    {addMut.isPending ? "Ajout..." : "Enregistrer"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">Revenus (mois)</span></div>
            <p className="text-2xl font-bold text-accent">{totalCredits.toLocaleString()} €</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><ArrowDownRight className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground uppercase">Dépenses (mois)</span></div>
            <p className="text-2xl font-bold text-destructive">{totalDebits.toLocaleString()} €</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-foreground" /><span className="text-xs text-muted-foreground uppercase">Résultat net</span></div>
            <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-accent" : "text-destructive"}`}>{netIncome.toLocaleString()} €</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-foreground" /><span className="text-xs text-muted-foreground uppercase">Écritures totales</span></div>
            <p className="text-2xl font-bold text-foreground">{allTransactions.length}</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="journal">
          <TabsList>
            <TabsTrigger value="journal"><BookOpen className="h-4 w-4 mr-1" />Journal</TabsTrigger>
            <TabsTrigger value="cashflow"><TrendingUp className="h-4 w-4 mr-1" />Cashflow</TabsTrigger>
          </TabsList>

          <TabsContent value="journal" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Journal des transactions</CardTitle>
                <Select value={filterCat} onValueChange={setFilterCat}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes catégories</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">Date</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Libellé</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Catégorie</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Débit</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Crédit</th>
                      <th className="text-center py-2 text-muted-foreground font-medium">Source</th>
                    </tr></thead>
                    <tbody>
                      {allTransactions.slice(0, 100).map(tx => (
                        <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 text-muted-foreground">{tx.date}</td>
                          <td className="py-2 font-medium text-foreground">{tx.label}</td>
                          <td className="py-2"><Badge variant="outline" className="text-xs">{CATEGORIES.find(c => c.value === tx.category)?.label || tx.category}</Badge></td>
                          <td className="py-2 text-right">{tx.debit > 0 ? <span className="text-destructive">{tx.debit.toLocaleString()} €</span> : "—"}</td>
                          <td className="py-2 text-right">{tx.credit > 0 ? <span className="text-accent">{tx.credit.toLocaleString()} €</span> : "—"}</td>
                          <td className="py-2 text-center"><Badge variant={tx.source === "auto" ? "secondary" : "default"} className="text-[10px]">{tx.source === "auto" ? "Auto" : "Manuel"}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cashflow" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Cashflow — 6 derniers mois</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={cashflowData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="revenus" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Revenus" />
                    <Bar dataKey="depenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Dépenses" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Résultat net mensuel</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={cashflowData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Line type="monotone" dataKey="net" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} name="Net" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Accounting;
