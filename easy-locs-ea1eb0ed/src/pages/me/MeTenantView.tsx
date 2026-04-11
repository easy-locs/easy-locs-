import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { tenantService } from "@/services/property.service";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/country-config";
import {
  ArrowLeft, Home, Key, Receipt, CreditCard, Calendar, MapPin,
  CheckCircle, Clock, AlertTriangle, Download, FileText, Building2,
  Phone, Mail, Users, Shield, Sofa, Ruler, DollarSign, Eye,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "overview" | "bail" | "quittances" | "paiements";

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Mon logement", icon: Home },
  { key: "bail", label: "Mon bail", icon: Key },
  { key: "quittances", label: "Quittances", icon: Receipt },
  { key: "paiements", label: "Paiements", icon: CreditCard },
];

export default function MeTenantView() {
  const navigate = useNavigate();
  const { user, userCountry } = useAuth();
  const { t } = useI18n();
  const fmt = useCallback((n: number) => formatCurrency(n, userCountry), [userCountry]);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: tenantData, isLoading , isError } = useQuery({
    queryKey: ["tenant-full-view", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const result = await tenantService.fetchFullTenantView(user?.id);
      if (!result) return null;
      const { tenant, rentCalls: rentCallsData, leases: leasesData, documents: docsData } = result;

      return {
        tenant,
        property: tenant.properties,
        rentCalls: rentCallsData,
        leases: leasesData,
        documents: docsData,
      };
    },
  });

  if (isError) return (<div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>);
  if (isLoading) {
    return (
      <div className="app-mobile-page app-mobile-content max-w-md mx-auto px-4 py-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))]">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-32 w-full mb-3" />
        <Skeleton className="h-10 w-full mb-3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!tenantData) {
    return (
      <div className="app-mobile-page app-mobile-content max-w-md mx-auto px-4 py-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/me/gestion-immo")} className="p-2 rounded-xl bg-muted/50 active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Mon logement</h1>
        </div>
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
            <Home className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">Aucune location active</p>
          <p className="text-xs text-muted-foreground">Vous n'êtes associé à aucun logement en tant que locataire</p>
        </div>
      </div>
    );
  }

  const { tenant, property, rentCalls, leases, documents } = tenantData;
  const monthlyTotal = (tenant.rent_amount || 0) + (tenant.charges_amount || 0);
  const paidCalls = rentCalls.filter((r: any) => r.paid);
  const unpaidCalls = rentCalls.filter((r: any) => !r.paid);
  const totalPaid = paidCalls.reduce((s: number, r: any) => s + (r.total_amount || 0), 0);
  const quittances = documents.filter((d: any) => d.doc_type === "quittance" || d.doc_type === "rent-receipt");
  const activeLease = leases.find((l: any) => l.status === "active");

  return (
    <div className="app-mobile-page app-mobile-content max-w-md mx-auto px-4 py-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))]">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/me/gestion-immo")} className="p-2 rounded-xl bg-muted/50 active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Mon logement</h1>
            <p className="text-[11px] text-muted-foreground">{property?.label || "—"}</p>
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-card border border-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] pointer-events-none" style={{ background: "radial-gradient(circle, hsl(152 60% 42%) 0%, transparent 70%)" }} />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-foreground">{fmt(monthlyTotal)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Loyer/mois</p>
            </div>
            <div>
              <p className={`text-lg font-bold ${unpaidCalls.length > 0 ? "text-destructive" : "text-emerald-600"}`}>
                {unpaidCalls.length}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Impayé{unpaidCalls.length !== 1 ? "s" : ""}</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{fmt(totalPaid)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Total payé</p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 p-1 rounded-2xl bg-muted/50 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {property && (
                <div className="rounded-2xl p-4 bg-card border border-border space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Mon logement</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <InfoRow icon={MapPin} label="Adresse" value={`${property.address}, ${property.city}`} />
                    <InfoRow icon={Building2} label="Type" value={property.property_type || "—"} />
                    <InfoRow icon={Ruler} label="Surface" value={`${property.surface || 0} m²`} />
                    <InfoRow icon={Home} label="Pièces" value={`${property.rooms || 0}`} />
                    <InfoRow icon={Sofa} label="Meublé" value={property.furnished ? "Oui" : "Non"} />
                  </div>
                </div>
              )}

              <div className="rounded-2xl p-4 bg-card border border-border space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Mon bail</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <InfoRow icon={DollarSign} label="Loyer" value={fmt(tenant.rent_amount || 0)} />
                  <InfoRow icon={DollarSign} label="Charges" value={fmt(tenant.charges_amount || 0)} />
                  <InfoRow icon={Shield} label="Dépôt" value={fmt(tenant.deposit_amount || 0)} />
                  <InfoRow icon={Calendar} label="Début" value={tenant.lease_start ? new Date(tenant.lease_start).toLocaleDateString("fr-FR") : "—"} />
                  {tenant.lease_end && <InfoRow icon={Calendar} label="Fin" value={new Date(tenant.lease_end).toLocaleDateString("fr-FR")} />}
                  <InfoRow icon={Key} label="Type" value={tenant.lease_type === "furnished" ? "Meublé" : tenant.lease_type === "commercial" ? "Commercial" : "Nu"} />
                </div>
              </div>

              {unpaidCalls.length > 0 && (
                <div className="rounded-2xl p-4 bg-destructive/5 border border-destructive/20 space-y-2">
                  <h3 className="text-xs font-bold text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Loyer{unpaidCalls.length > 1 ? "s" : ""} en attente
                  </h3>
                  {unpaidCalls.slice(0, 3).map((rc: any) => {
                    const monthLabel = rc.month ? new Date(rc.month + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—";
                    return (
                      <div key={rc.id} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-foreground capitalize">{monthLabel}</span>
                        <span className="text-sm font-bold text-destructive">{fmt(rc.total_amount)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "bail" && (
            <motion.div key="bail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {activeLease ? (
                <div className="rounded-2xl p-4 bg-card border border-border space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-bold text-foreground">Bail actif</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">Actif</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <InfoRow icon={Calendar} label="Début" value={activeLease.start_date ? new Date(activeLease.start_date).toLocaleDateString("fr-FR") : "—"} />
                    <InfoRow icon={Calendar} label="Fin" value={activeLease.end_date ? new Date(activeLease.end_date).toLocaleDateString("fr-FR") : "Indéterminée"} />
                    <InfoRow icon={DollarSign} label="Loyer" value={fmt(activeLease.rent_amount || 0)} />
                    <InfoRow icon={DollarSign} label="Charges" value={fmt(activeLease.charges_amount || 0)} />
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {activeLease.signed_by_tenant ? (
                      <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Signé par vous</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3" /> En attente de votre signature</span>
                    )}
                    {activeLease.signed_by_owner ? (
                      <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Signé par le bailleur</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3" /> Bailleur en attente</span>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState icon={Key} message="Pas de bail numérique" sub="Votre bail n'a pas encore été enregistré dans l'application" />
              )}

              {leases.filter((l: any) => l.id !== activeLease?.id).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground">Historique</h4>
                  {leases.filter((l: any) => l.id !== activeLease?.id).map((l: any) => (
                    <div key={l.id} className="rounded-xl p-3 bg-muted/30 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">{l.start_date ? new Date(l.start_date).toLocaleDateString("fr-FR") : "—"}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{l.status}</p>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">{fmt(l.rent_amount || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "quittances" && (
            <motion.div key="quittances" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="rounded-2xl p-3 bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[11px] text-muted-foreground">
                  Vos quittances de loyer sont générées automatiquement après chaque paiement validé par votre bailleur.
                </p>
              </div>

              {paidCalls.length > 0 ? (
                <div className="space-y-2">
                  {paidCalls.map((rc: any) => {
                    const monthLabel = rc.month ? new Date(rc.month + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—";
                    return (
                      <div key={rc.id} className="rounded-2xl p-3.5 bg-card border border-border flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Receipt className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground capitalize">{monthLabel}</p>
                            <p className="text-[10px] text-muted-foreground">{fmt(rc.total_amount)}</p>
                          </div>
                        </div>
                        {rc.receipt_pdf_url ? (
                          <a href={rc.receipt_pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 active:scale-95 transition-transform">
                            <Download className="w-3 h-3" /> PDF
                          </a>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">En cours...</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={Receipt} message="Aucune quittance" sub="Les quittances apparaîtront après validation de vos paiements" />
              )}
            </motion.div>
          )}

          {activeTab === "paiements" && (
            <motion.div key="paiements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {unpaidCalls.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> À payer ({unpaidCalls.length})
                  </h3>
                  {unpaidCalls.map((rc: any) => {
                    const monthLabel = rc.month ? new Date(rc.month + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—";
                    return (
                      <div key={rc.id} className="rounded-2xl p-3.5 bg-card border border-destructive/20">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-foreground capitalize">{monthLabel}</p>
                          <p className="text-sm font-bold text-destructive">{fmt(rc.total_amount)}</p>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Loyer: {fmt(rc.rent_amount)} + Charges: {fmt(rc.charges_amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {paidCalls.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Historique ({paidCalls.length})
                  </h3>
                  {paidCalls.map((rc: any) => {
                    const monthLabel = rc.month ? new Date(rc.month + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—";
                    return (
                      <div key={rc.id} className="rounded-2xl p-3.5 bg-card border border-border flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground capitalize">{monthLabel}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Payé le {rc.paid_date ? new Date(rc.paid_date).toLocaleDateString("fr-FR") : "—"}
                              {rc.payment_method && ` · ${rc.payment_method}`}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-emerald-600">{fmt(rc.total_amount)}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {rentCalls.length === 0 && (
                <EmptyState icon={CreditCard} message="Aucun paiement" sub="L'historique de vos paiements apparaîtra ici" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground">{label}:</span>
      <span className="text-[11px] font-semibold text-foreground truncate">{value}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, message, sub }: { icon: React.ComponentType<{ className?: string }>; message: string; sub: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
