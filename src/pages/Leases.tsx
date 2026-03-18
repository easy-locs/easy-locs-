/**
 * Leases — Canonical lease management using the `leases` table.
 * Route: /dashboard/leases
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PropertyHubBreadcrumb from "@/components/property/PropertyHubBreadcrumb";
import SignatureDialog from "@/components/documents/SignatureDialog";
import LeaseFormDialog from "@/components/leases/LeaseFormDialog";
import LeaseStatusBadge from "@/components/leases/LeaseStatusBadge";
import { useLeaseWorkflow } from "@/hooks/useLeaseWorkflow";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/country-config";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus, Search, FileText, Calendar, Euro, MapPin, Home,
  Users, ChevronRight, PenTool, Clock, CheckCircle, Shield,
  ArrowRight, Download, Building, KeyRound
} from "lucide-react";

type LeaseRow = {
  id: string;
  property_id: string;
  tenant_id: string;
  lease_type: string;
  start_date: string;
  end_date: string | null;
  payment_day: number | null;
  rent_amount: number;
  charges_amount: number;
  deposit_amount: number;
  country: string;
  status: string;
  signed_by_tenant: boolean | null;
  signed_by_owner: boolean | null;
  tenant_signed_at: string | null;
  owner_signed_at: string | null;
  rent_schedule_generated: boolean;
  created_at: string;
  // Joined
  tenants?: { name: string; email: string | null } | null;
  properties?: { label: string; address: string; city: string; country: string } | null;
};

type StatusFilter = "all" | "active" | "pending_signature" | "draft" | "archived";

const Leases = () => {
  const { orgId, userCountry } = useAuth();
  const countryFilter = useCountryFilter();
  const { t } = useI18n();
  const qc = useQueryClient();
  const { recordOwnerSignature, recordTenantSignature } = useLeaseWorkflow();
  const [searchParams] = useSearchParams();
  const preselectedProperty = searchParams.get("property") || "";

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editLease, setEditLease] = useState<any>(null);
  const [signLeaseId, setSignLeaseId] = useState<string | null>(null);
  const [signRole, setSignRole] = useState<"owner" | "tenant">("owner");

  const fmt = (n: number) => formatCurrency(n, userCountry);

  const { data: leases = [], isLoading, refetch } = useQuery({
    queryKey: ["leases", orgId, countryFilter],
    queryFn: async () => {
      let query = supabase
        .from("leases")
        .select("*, tenants(name, email), properties(label, address, city, country)")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });

      if (countryFilter) query = query.eq("country", countryFilter);

      const { data } = await query;
      return (data || []) as LeaseRow[];
    },
    enabled: !!orgId,
  });

  const filtered = leases.filter(l => {
    if (filter === "active") return l.status === "active";
    if (filter === "pending_signature") return l.status === "pending_signature" || l.status === "signed";
    if (filter === "draft") return l.status === "draft";
    if (filter === "archived") return l.status === "archived" || l.status === "cancelled";
    return true;
  }).filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (l.tenants as any)?.name?.toLowerCase().includes(q) ||
      (l.properties as any)?.label?.toLowerCase().includes(q);
  });

  const counts = {
    all: leases.length,
    active: leases.filter(l => l.status === "active").length,
    pending: leases.filter(l => l.status === "pending_signature" || l.status === "signed").length,
    draft: leases.filter(l => l.status === "draft").length,
  };

  const totalRev = leases.filter(l => l.status === "active").reduce((s, l) => s + l.rent_amount + l.charges_amount, 0);

  const handleSaved = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ["leases"] });
  };

  const leaseTypeLabel = (t: string) =>
    t === "furnished" ? "Furnished" : t === "commercial" ? "Commercial" : "Unfurnished";

  return (
    <DashboardLayout>
      <FeatureGate feature="legal_documents" featureLabel="Leases">
        <PropertyHubBreadcrumb currentPage="Leases" />
        <div className="max-w-5xl mx-auto space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Leases</h1>
                <p className="text-sm text-muted-foreground">Manage contracts and signatures</p>
              </div>
              <Button onClick={() => { setEditLease(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> New Lease
              </Button>
            </div>
          </motion.div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: "Total Leases", value: counts.all },
              { label: "Active", value: counts.active },
              { label: "Pending Signature", value: counts.pending },
              { label: "Monthly Revenue", value: fmt(totalRev) },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{typeof kpi.value === "number" ? kpi.value : kpi.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenant or property..." className="pl-9" />
            </div>
            <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5 overflow-x-auto">
              {([
                { key: "all" as const, label: `All (${counts.all})` },
                { key: "active" as const, label: `Active (${counts.active})` },
                { key: "pending_signature" as const, label: `Pending (${counts.pending})` },
                { key: "draft" as const, label: `Draft (${counts.draft})` },
              ]).map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${filter === f.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lease list */}
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <KeyRound className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-3">No leases found</p>
              <Button onClick={() => { setEditLease(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Create your first lease
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(lease => {
                const tenantName = (lease.tenants as any)?.name || "—";
                const propLabel = (lease.properties as any)?.label || "—";
                const propCity = (lease.properties as any)?.city || "";
                const total = lease.rent_amount + lease.charges_amount;
                const tenantSigned = !!lease.tenant_signed_at;
                const ownerSigned = !!lease.owner_signed_at;

                return (
                  <motion.div key={lease.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="bg-card rounded-xl p-5 border border-border/50 shadow-card hover:shadow-card-hover transition-all">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${lease.status === "active" ? "bg-success/10" : "bg-muted"}`}>
                          <KeyRound className={`h-5 w-5 ${lease.status === "active" ? "text-success" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground text-sm">{tenantName}</span>
                            <LeaseStatusBadge status={lease.status} />
                            <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {leaseTypeLabel(lease.lease_type)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Home className="h-3 w-3" /> {propLabel}
                            <span className="mx-1">·</span>
                            <MapPin className="h-3 w-3" /> {propCity}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {lease.start_date} → {lease.end_date || "∞"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Euro className="h-3 w-3" />
                              {fmt(total)}/mo
                            </span>
                            {lease.payment_day && (
                              <span>Due: {lease.payment_day}th</span>
                            )}
                          </div>

                          {/* Signature progress */}
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${tenantSigned ? "border-success/30 bg-success/5" : "border-border"}`}>
                              {tenantSigned ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span className={tenantSigned ? "text-success font-medium" : "text-muted-foreground"}>
                                Tenant {tenantSigned ? "✓" : "—"}
                              </span>
                            </div>
                            <div className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${ownerSigned ? "border-success/30 bg-success/5" : "border-border"}`}>
                              {ownerSigned ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span className={ownerSigned ? "text-success font-medium" : "text-muted-foreground"}>
                                Owner {ownerSigned ? "✓" : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 flex-wrap">
                        <button onClick={() => { setEditLease(lease); setFormOpen(true); }}
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md hover:bg-muted/50">
                          <FileText className="h-3.5 w-3.5" /> Edit
                        </button>

                        {!ownerSigned && lease.status !== "draft" && (
                          <button onClick={() => { setSignLeaseId(lease.id); setSignRole("owner"); }}
                            className="inline-flex items-center gap-1.5 text-xs font-medium bg-accent/10 text-accent px-3 py-1.5 rounded-md hover:bg-accent/20 transition-colors">
                            <PenTool className="h-3.5 w-3.5" /> Sign (Owner)
                          </button>
                        )}

                        {!tenantSigned && lease.status !== "draft" && (
                          <button onClick={() => { setSignLeaseId(lease.id); setSignRole("tenant"); }}
                            className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 transition-colors">
                            <PenTool className="h-3.5 w-3.5" /> Sign (Tenant)
                          </button>
                        )}

                        {lease.status === "draft" && (
                          <button
                            onClick={async () => {
                              await supabase.from("leases").update({ status: "pending_signature" }).eq("id", lease.id);
                              refetch();
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-medium bg-accent text-accent-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
                            <PenTool className="h-3.5 w-3.5" /> Send for Signature
                          </button>
                        )}

                        {lease.status === "active" && lease.rent_schedule_generated && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success ml-auto">
                            <Shield className="h-3.5 w-3.5" /> Active — Schedule generated
                          </span>
                        )}

                        <Link to={`/dashboard/rent-cockpit?lease=${lease.id}`}
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground ml-auto px-2.5 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
                          Rent Calls <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Form dialog */}
        <LeaseFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          lease={editLease}
          onSaved={handleSaved}
          preselectedPropertyId={preselectedProperty}
        />

        {/* Signature dialog */}
        {signLeaseId && (
          <SignatureDialog
            open={!!signLeaseId}
            onOpenChange={(open) => { if (!open) setSignLeaseId(null); }}
            documentId={signLeaseId}
            documentTitle="Lease Signature"
            signerRole={signRole}
            onSigned={async () => {
              if (signRole === "owner") {
                await recordOwnerSignature(signLeaseId!);
              } else {
                await recordTenantSignature(signLeaseId!);
              }
              refetch();
            }}
          />
        )}
      </FeatureGate>
    </DashboardLayout>
  );
};

export default Leases;
