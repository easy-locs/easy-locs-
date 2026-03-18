/**
 * LandlordRentDashboard — Rent cockpit showing all rent_calls by status.
 * Route: /dashboard/rent-cockpit
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/country-config";
import RentStatusBadge from "@/components/rent/RentStatusBadge";
import ReceiptStatusBadge from "@/components/rent/ReceiptStatusBadge";
import PropertyHubBreadcrumb from "@/components/property/PropertyHubBreadcrumb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Receipt, Users, FileText, MessageCircle, Search, Filter,
  ChevronRight, AlertTriangle, CheckCircle, Clock, TrendingUp,
  Download, DollarSign
} from "lucide-react";

type RentCallRow = {
  id: string;
  tenant_id: string;
  property_id: string;
  lease_id: string | null;
  month: string;
  rent_amount: number;
  charges_amount: number;
  total_amount: number;
  paid: boolean;
  paid_amount: number;
  paid_date: string | null;
  payment_status: string;
  payment_method: string | null;
  receipt_pdf_url: string | null;
  receipt_validated: boolean;
  // Joined
  tenants?: { name: string; email: string | null } | null;
  properties?: { label: string; city: string; country: string } | null;
};

type StatusFilter = "all" | "pending" | "reminded" | "late" | "dunning" | "partial" | "paid";

const STATUS_TABS: { key: StatusFilter; label: string; icon: any; color: string }[] = [
  { key: "all", label: "All", icon: Receipt, color: "text-foreground" },
  { key: "pending", label: "Due", icon: Clock, color: "text-muted-foreground" },
  { key: "late", label: "Late", icon: AlertTriangle, color: "text-destructive" },
  { key: "dunning", label: "Dunning", icon: AlertTriangle, color: "text-destructive" },
  { key: "partial", label: "Partial", icon: DollarSign, color: "text-info" },
  { key: "paid", label: "Paid", icon: CheckCircle, color: "text-success" },
];

const LandlordRentDashboard = () => {
  const { orgId, userCountry } = useAuth();
  const countryFilter = useCountryFilter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const fmt = (n: number) => formatCurrency(n, userCountry);

  const { data: rentCalls = [], isLoading } = useQuery({
    queryKey: ["rent-cockpit", orgId, countryFilter],
    queryFn: async () => {
      let query = supabase
        .from("rent_calls")
        .select("id, tenant_id, property_id, lease_id, month, rent_amount, charges_amount, total_amount, paid, paid_amount, paid_date, payment_status, payment_method, receipt_pdf_url, receipt_validated, tenants(name, email), properties(label, city, country)")
        .eq("org_id", orgId!)
        .order("month", { ascending: false });

      if (countryFilter) {
        const { data: props } = await supabase.from("properties").select("id").eq("org_id", orgId!).eq("country", countryFilter);
        const ids = (props || []).map(p => p.id);
        if (ids.length > 0) query = query.in("property_id", ids);
        else return [];
      }

      const { data } = await query.limit(500);
      return (data || []) as RentCallRow[];
    },
    enabled: !!orgId,
  });

  const filtered = useMemo(() => {
    let list = rentCalls;
    if (statusFilter !== "all") {
      if (statusFilter === "paid") list = list.filter(r => r.paid || r.payment_status === "paid");
      else if (statusFilter === "pending") list = list.filter(r => !r.paid && (r.payment_status === "pending" || r.payment_status === "reminded"));
      else if (statusFilter === "late") list = list.filter(r => r.payment_status === "late");
      else if (statusFilter === "dunning") list = list.filter(r => r.payment_status === "dunning");
      else if (statusFilter === "partial") list = list.filter(r => r.payment_status === "partial");
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.tenants as any)?.name?.toLowerCase().includes(q) ||
        (r.properties as any)?.label?.toLowerCase().includes(q) ||
        r.month.includes(q)
      );
    }
    return list;
  }, [rentCalls, statusFilter, search]);

  // KPIs
  const kpis = useMemo(() => {
    const total = rentCalls.reduce((s, r) => s + r.total_amount, 0);
    const collected = rentCalls.filter(r => r.paid).reduce((s, r) => s + r.total_amount, 0);
    const lateCount = rentCalls.filter(r => r.payment_status === "late" || r.payment_status === "dunning").length;
    const pendingAmount = rentCalls.filter(r => !r.paid).reduce((s, r) => s + (r.total_amount - (r.paid_amount || 0)), 0);
    return { total, collected, lateCount, pendingAmount };
  }, [rentCalls]);

  return (
    <DashboardLayout>
      <PropertyHubBreadcrumb currentPage="Rent Cockpit" />
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Rent Cockpit</h1>
          <p className="text-sm text-muted-foreground">Track all rent payments across your portfolio</p>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Expected", value: fmt(kpis.total), icon: TrendingUp },
            { label: "Collected", value: fmt(kpis.collected), icon: CheckCircle },
            { label: "Outstanding", value: fmt(kpis.pendingAmount), icon: Clock },
            { label: "Late / Dunning", value: String(kpis.lateCount), icon: AlertTriangle },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="bg-card rounded-xl p-4 border border-border/50 shadow-card">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground tabular-nums">{kpi.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenant, property, period..." className="pl-9" />
          </div>
          <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5 overflow-x-auto">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${statusFilter === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rent calls list */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No rent calls found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(rc => (
              <div key={rc.id} className="bg-card rounded-xl p-4 border border-border/50 shadow-card hover:shadow-card-hover transition-all">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${rc.paid ? "bg-success/10" : rc.payment_status === "late" || rc.payment_status === "dunning" ? "bg-destructive/10" : "bg-muted"}`}>
                    {rc.paid ? <CheckCircle className="h-5 w-5 text-success" /> : rc.payment_status === "late" ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{(rc.tenants as any)?.name || "—"}</span>
                      <RentStatusBadge status={rc.payment_status || (rc.paid ? "paid" : "pending")} />
                      <span className="text-xs text-muted-foreground">{rc.month}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(rc.properties as any)?.label || "—"} · {(rc.properties as any)?.city || ""}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="font-medium text-foreground">{fmt(rc.total_amount)}</span>
                      {rc.paid_amount > 0 && rc.paid_amount < rc.total_amount && (
                        <span className="text-info">Paid: {fmt(rc.paid_amount)}</span>
                      )}
                      {rc.payment_method && (
                        <span className="text-muted-foreground">{rc.payment_method}</span>
                      )}
                      {rc.paid_date && (
                        <span className="text-muted-foreground">{rc.paid_date}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {rc.receipt_pdf_url && (
                      <a href={rc.receipt_pdf_url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Receipt">
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                    {rc.lease_id && (
                      <Link to={`/dashboard/leases?record=${rc.lease_id}`}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors" title="View lease">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    )}
                    <Link to={`/app/orbit?context=rent_call&contextId=${rc.id}`}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Orbit thread">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LandlordRentDashboard;
