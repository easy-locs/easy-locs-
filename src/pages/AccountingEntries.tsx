/**
 * AccountingEntries — Landlord UI for accounting_entries table.
 * Filterable by country, property, lease, tenant, period.
 * Route: /dashboard/accounting-entries
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PropertyHubBreadcrumb from "@/components/property/PropertyHubBreadcrumb";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/country-config";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Calculator, Download, Search, Filter, Building, Users,
  FileText, Globe, Calendar
} from "lucide-react";

const AccountingEntries = () => {
  const { orgId, userCountry } = useAuth();
  const fmt = (n: number) => formatCurrency(n, userCountry);

  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["accounting-entries", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("accounting_entries")
        .select("*, properties(label, city), tenants(name), leases(lease_type, start_date)")
        .eq("org_id", orgId!)
        .order("accounting_period", { ascending: false })
        .limit(500);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["props-for-accounting", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id, label, country").eq("org_id", orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  const countries = useMemo(() => {
    const set = new Set(entries.map((e: any) => e.country_code));
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    let list = entries as any[];
    if (filterCountry !== "all") list = list.filter(e => e.country_code === filterCountry);
    if (filterProperty !== "all") list = list.filter(e => e.property_id === filterProperty);
    if (filterPeriod) list = list.filter(e => e.accounting_period?.startsWith(filterPeriod));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.description?.toLowerCase().includes(q) ||
        e.entry_type?.toLowerCase().includes(q) ||
        e.tenants?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [entries, filterCountry, filterProperty, filterPeriod, search]);

  const totals = useMemo(() => {
    const income = filtered.filter((e: any) => e.entry_type === "rent_income" || e.entry_type === "charges_income").reduce((s: number, e: any) => s + e.amount, 0);
    const expenses = filtered.filter((e: any) => e.entry_type !== "rent_income" && e.entry_type !== "charges_income").reduce((s: number, e: any) => s + e.amount, 0);
    return { income, expenses, net: income - expenses };
  }, [filtered]);

  const exportCSV = () => {
    const headers = "Period,Type,Amount,Currency,Country,Property,Tenant,Description,Payment Method,Reference\n";
    const rows = filtered.map((e: any) =>
      `${e.accounting_period},${e.entry_type},${e.amount},${e.currency},${e.country_code},"${e.properties?.label || ""}","${e.tenants?.name || ""}","${e.description || ""}",${e.payment_method || ""},${e.external_reference || ""}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `accounting_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <PropertyHubBreadcrumb currentPage="Accounting Entries" />
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Accounting Entries</h1>
              <p className="text-sm text-muted-foreground">Full financial ledger linked to leases, properties and tenants</p>
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Income", value: fmt(totals.income), color: "text-success" },
            { label: "Expenses", value: fmt(totals.expenses), color: "text-destructive" },
            { label: "Net", value: fmt(totals.net), color: totals.net >= 0 ? "text-success" : "text-destructive" },
          ].map(kpi => (
            <div key={kpi.label} className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={`text-xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries..." className="pl-9" />
          </div>
          <Select value={filterCountry} onValueChange={setFilterCountry}>
            <SelectTrigger className="w-32"><Globe className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger className="w-40"><Building className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All properties</SelectItem>
              {properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="month" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="w-40" placeholder="Period" />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No accounting entries found</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Period</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Property</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Tenant</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Country</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e: any) => (
                    <tr key={e.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-foreground font-mono text-xs">{e.accounting_period}</td>
                      <td className="p-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          e.entry_type === "rent_income" ? "bg-success/10 text-success" :
                          e.entry_type === "charges_income" ? "bg-info/10 text-info" :
                          "bg-muted text-muted-foreground"
                        }`}>{e.entry_type.replace(/_/g, " ")}</span>
                      </td>
                      <td className="p-3 text-right font-bold tabular-nums text-foreground">{fmt(e.amount)}</td>
                      <td className="p-3 text-muted-foreground text-xs">{e.properties?.label || "—"}</td>
                      <td className="p-3 text-muted-foreground text-xs">{e.tenants?.name || "—"}</td>
                      <td className="p-3 text-muted-foreground text-xs">{e.country_code}</td>
                      <td className="p-3 text-muted-foreground text-xs">{e.payment_method || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AccountingEntries;
