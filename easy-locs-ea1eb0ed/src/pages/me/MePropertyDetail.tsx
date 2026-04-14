import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { useRentalData } from "@/hooks/useRentalData";
import { useRentalReceipts } from "@/hooks/rental/useRentalReceipts";
import { useRentalLeaseGenerator } from "@/hooks/rental/useRentalLeaseGenerator";
import { formatCurrency, getCountryConfig } from "@/lib/country-config";
import { useQuery } from "@tanstack/react-query";
import { leaseServiceExtended, documentService } from "@/services/property.service";
import * as rentalRepo from "@/repositories/rental-data.repository";
import {
  ArrowLeft, Home, Users, Key, Receipt, CreditCard, ChevronRight,
  MapPin, Building2, Ruler, Calendar, FileText, Download, CheckCircle,
  AlertTriangle, Clock, Zap, Plus, Eye, Send, Phone, Mail,
  Thermometer, Sofa, DollarSign, Shield, MoreVertical, RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AppCardTitle } from "@/components/ui/AppText";
import { useUiEngine } from "@/hooks/useUiEngine";

type Tab = "overview" | "bail" | "appels" | "quittances" | "paiements";

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Vue", icon: Eye },
  { key: "bail", label: "Bail", icon: Key },
  { key: "appels", label: "Appels", icon: Zap },
  { key: "quittances", label: "Quittances", icon: Receipt },
  { key: "paiements", label: "Paiements", icon: CreditCard },
];

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } },
};

export default function MePropertyDetail() {
  useUiEngine("me-mepropertydetail");
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { user, orgId, userCountry } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const fmt = useCallback((n: number) => formatCurrency(n, userCountry), [userCountry]);

  const { properties, tenants, rentCalls, loading, togglePayment } = useRentalData();
  const { generateReceiptForPayment } = useRentalReceipts(properties, tenants, userCountry);
  const { autoGenerateLease } = useRentalLeaseGenerator(properties, userCountry);

  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const property = useMemo(() => properties.find(p => p.id === propertyId), [properties, propertyId]);
  const today = new Date().toISOString().split("T")[0];
  const propTenants = useMemo(() => tenants.filter(t => t.property_id === propertyId), [tenants, propertyId]);
  const activeTenants = useMemo(() => propTenants.filter(t => !t.lease_end || t.lease_end >= today), [propTenants, today]);
  const propRentCalls = useMemo(() => rentCalls.filter(r => r.property_id === propertyId).sort((a, b) => (b.month || "").localeCompare(a.month || "")), [rentCalls, propertyId]);

  const generatePropertyRentCalls = useCallback(async () => {
    if (!orgId || !propertyId) return;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const propTenantsActive = propTenants.filter(t => t.rent_amount > 0 && (!t.lease_end || t.lease_end >= today));
    if (propTenantsActive.length === 0) {
      toast({ title: "Aucun locataire actif", description: "Ajoutez un locataire avec un loyer défini" });
      return;
    }
    const existingCalls = await rentalRepo.fetchExistingRentCallsForMonth(orgId, month);
    const existingIds = new Set(existingCalls.map((r: any) => r.tenant_id));
    const newCalls = propTenantsActive
      .filter(tn => !existingIds.has(tn.id))
      .map(tn => ({
        org_id: orgId, tenant_id: tn.id, property_id: propertyId, month,
        rent_amount: tn.rent_amount, charges_amount: tn.charges_amount,
        total_amount: tn.rent_amount + tn.charges_amount,
      }));
    if (newCalls.length === 0) {
      toast({ title: "Déjà généré", description: "Les appels de loyer de ce mois sont déjà créés" });
      return;
    }
    try {
      await rentalRepo.insertRentCalls(newCalls);
      toast({ title: `${newCalls.length} appel(s) généré(s)` });
    } catch (err: any) {
      console.error("[Property]", err.message);
      toast({ title: "Erreur", description: "Une erreur est survenue. Veuillez réessayer.", variant: "destructive" });
    }
  }, [orgId, propertyId, propTenants, today, toast]);

  const { data: leases = [] , isError } = useQuery({
    queryKey: ["property-leases", propertyId, orgId],
    enabled: !!propertyId && !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      return leaseServiceExtended.fetchByPropertyAndOrg(propertyId!, orgId!);
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["property-documents", propertyId, orgId],
    enabled: !!propertyId && !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      return documentService.fetchByPropertyAndOrg(propertyId!, orgId!);
    },
  });

  const cc = useMemo(() => getCountryConfig(property?.country || userCountry), [property?.country, userCountry]);

  if (loading) {
    if (isError) return (<div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>);

  return (
      <div className="app-mobile-page app-mobile-content max-w-md mx-auto px-4 py-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))]">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-32 w-full mb-3" />
        <Skeleton className="h-10 w-full mb-3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="app-mobile-page app-mobile-content max-w-md mx-auto px-4 py-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))]">
        <div className="flex flex-col items-center py-20 text-center">
          <Home className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-sm font-semibold text-foreground">Bien introuvable</p>
          <button onClick={() => navigate("/me/gestion-immo")} className="text-primary text-sm mt-2 underline">Retour</button>
        </div>
      </div>
    );
  }

  const monthlyTotal = property.monthly_rent + property.monthly_charges;
  const paidCalls = propRentCalls.filter(r => r.paid);
  const unpaidCalls = propRentCalls.filter(r => !r.paid);
  const totalCollected = paidCalls.reduce((s, r) => s + r.total_amount, 0);
  const quittances = documents.filter((d: any) => d.doc_type === "quittance" || d.doc_type === "rent-receipt");
  const bailDocs = documents.filter((d: any) => d.doc_type === "lease" || d.doc_type === "bail" || d.doc_type?.includes("lease"));

  return (
    <div className="app-mobile-page app-mobile-content max-w-md mx-auto px-4 py-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))]">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/me/gestion-immo")} className="p-2 rounded-xl bg-muted/50 active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground break-words">{property.label}</h1>
            <p className="text-[11px] text-muted-foreground line-clamp-1 break-words flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" /> {property.address}, {property.city}
            </p>
          </div>
        </div>

        <PropertyHeader property={property} activeTenants={activeTenants} fmt={fmt} monthlyTotal={monthlyTotal} totalCollected={totalCollected} unpaidCount={unpaidCalls.length} />

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
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <OverviewTab property={property} activeTenants={activeTenants} propTenants={propTenants} leases={leases} fmt={fmt} cc={cc} />
            </motion.div>
          )}
          {activeTab === "bail" && (
            <motion.div key="bail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <BailTab leases={leases} bailDocs={bailDocs} fmt={fmt} navigate={navigate} activeTenants={activeTenants} autoGenerateLease={autoGenerateLease} property={property} toast={toast} />
            </motion.div>
          )}
          {activeTab === "appels" && (
            <motion.div key="appels" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AppelsTab propRentCalls={propRentCalls} fmt={fmt} generateMonthlyRentCalls={generatePropertyRentCalls} />
            </motion.div>
          )}
          {activeTab === "quittances" && (
            <motion.div key="quittances" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <QuittancesTab quittances={quittances} paidCalls={paidCalls} fmt={fmt} generateReceiptForPayment={generateReceiptForPayment} tenants={propTenants} />
            </motion.div>
          )}
          {activeTab === "paiements" && (
            <motion.div key="paiements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PaiementsTab propRentCalls={propRentCalls} fmt={fmt} togglePayment={togglePayment} tenants={propTenants} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PropertyHeader({ property, activeTenants, fmt, monthlyTotal, totalCollected, unpaidCount }: {
  property: any; activeTenants: any[]; fmt: (n: number) => string; monthlyTotal: number; totalCollected: number; unpaidCount: number;
}) {
  const isOccupied = activeTenants.length > 0;
  return (
    <div className="rounded-2xl p-4 bg-card border border-border relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] pointer-events-none" style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }} />
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-foreground">{fmt(monthlyTotal)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Loyer/mois</p>
        </div>
        <div>
          <p className="text-lg font-bold" style={{ color: isOccupied ? "hsl(152 60% 42%)" : "hsl(220 15% 50%)" }}>
            {activeTenants.length}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Locataire{activeTenants.length !== 1 ? "s" : ""}</p>
        </div>
        <div>
          <p className={`text-lg font-bold ${unpaidCount > 0 ? "text-destructive" : "text-foreground"}`}>{unpaidCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Impayé{unpaidCount !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ property, activeTenants, propTenants, leases, fmt, cc }: any) {
  const propertyType = cc.propertyTypes?.find((p: any) => p.value === property.property_type)?.label || property.property_type;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4 bg-card border border-border space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Caractéristiques</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <InfoRow icon={Building2} label="Type" value={propertyType} />
          <InfoRow icon={Ruler} label="Surface" value={`${property.surface} m²`} />
          <InfoRow icon={Home} label="Pièces" value={`${property.rooms}`} />
          <InfoRow icon={Thermometer} label="Chauffage" value={property.heating} />
          <InfoRow icon={Sofa} label="Meublé" value={property.furnished ? "Oui" : "Non"} />
          {property.floor != null && <InfoRow icon={Building2} label="Étage" value={`${property.floor}`} />}
        </div>
      </div>

      <div className="rounded-2xl p-4 bg-card border border-border space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Finances</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <InfoRow icon={DollarSign} label="Loyer" value={fmt(property.monthly_rent)} />
          <InfoRow icon={DollarSign} label="Charges" value={fmt(property.monthly_charges)} />
          <InfoRow icon={Shield} label="Dépôt" value={fmt(property.deposit_amount)} />
        </div>
      </div>

      {activeTenants.length > 0 && (
        <div className="rounded-2xl p-4 bg-card border border-border space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Locataires actifs</h3>
          {activeTenants.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground line-clamp-1 break-words">{t.name}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {t.email && <span className="flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" /> {t.email}</span>}
                  {t.phone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" /> {t.phone}</span>}
                </div>
              </div>
              <p className="text-xs font-bold text-foreground">{fmt(t.rent_amount + (t.charges_amount || 0))}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground">{label}:</span>
      <span className="text-[11px] font-semibold text-foreground line-clamp-1 break-words">{value}</span>
    </div>
  );
}

function BailTab({ leases, bailDocs, fmt, navigate, activeTenants, autoGenerateLease, property, toast }: any) {
  const handleAutoGenerate = async () => {
    if (activeTenants.length === 0) {
      toast({ title: "Aucun locataire", description: "Ajoutez un locataire avant de générer un bail", variant: "destructive" });
      return;
    }
    const tenant = activeTenants[0];
    try {
      await autoGenerateLease(tenant.id, {
        name: tenant.name, email: tenant.email, phone: tenant.phone,
        property_id: property.id, lease_start: tenant.lease_start, lease_end: tenant.lease_end,
        rent_amount: tenant.rent_amount, charges_amount: tenant.charges_amount,
        deposit_amount: tenant.deposit_amount, lease_type: tenant.lease_type,
        birth_date: tenant.birth_date, birth_place: tenant.birth_place,
      });
      toast({ title: "Bail généré avec succès" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de générer le bail", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <AppCardTitle lines={1}>Baux</AppCardTitle>
        <button
          onClick={handleAutoGenerate}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-transform"
          style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
        >
          <Zap className="w-3.5 h-3.5" /> Auto-générer
        </button>
      </div>

      {leases.length === 0 && bailDocs.length === 0 ? (
        <EmptyState icon={Key} message="Aucun bail" sub="Générez automatiquement un bail pour vos locataires" />
      ) : (
        <div className="space-y-2">
          {leases.map((lease: any) => (
            <div key={lease.id} className="rounded-2xl p-4 bg-card border border-border">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4" style={{ color: lease.status === "active" ? "hsl(152 60% 42%)" : "hsl(220 15% 50%)" }} />
                  <span className="text-sm font-semibold text-foreground">{lease.tenants?.name || "Locataire"}</span>
                </div>
                <LeaseStatusBadge status={lease.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <span><Calendar className="w-3 h-3 inline mr-1" />Début: {lease.start_date ? new Date(lease.start_date).toLocaleDateString("fr-FR") : "—"}</span>
                <span><Calendar className="w-3 h-3 inline mr-1" />Fin: {lease.end_date ? new Date(lease.end_date).toLocaleDateString("fr-FR") : "Indéterminée"}</span>
                <span>Loyer: {fmt(lease.rent_amount || 0)}</span>
                <span>Charges: {fmt(lease.charges_amount || 0)}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                {lease.signed_by_owner ? (
                  <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Signé (bailleur)</span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3" /> En attente signature</span>
                )}
                {lease.signed_by_tenant ? (
                  <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Signé (locataire)</span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3" /> En attente</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AppelsTab({ propRentCalls, fmt, generateMonthlyRentCalls }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <AppCardTitle lines={1}>Appels de loyer</AppCardTitle>
        <button
          onClick={generateMonthlyRentCalls}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-transform"
          style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
        >
          <Zap className="w-3.5 h-3.5" /> Générer ce mois
        </button>
      </div>

      {propRentCalls.length === 0 ? (
        <EmptyState icon={Zap} message="Aucun appel de loyer" sub="Générez automatiquement les appels mensuels" />
      ) : (
        <div className="space-y-2">
          {propRentCalls.map((rc: any) => (
            <RentCallCard key={rc.id} rentCall={rc} fmt={fmt} />
          ))}
        </div>
      )}
    </div>
  );
}

function RentCallCard({ rentCall, fmt }: { rentCall: any; fmt: (n: number) => string }) {
  const monthLabel = rentCall.month ? new Date(rentCall.month + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—";
  return (
    <div className="rounded-2xl p-3.5 bg-card border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${rentCall.paid ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
            {rentCall.paid ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground capitalize">{monthLabel}</p>
            <p className="text-[10px] text-muted-foreground">
              Loyer: {fmt(rentCall.rent_amount)} + Charges: {fmt(rentCall.charges_amount)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-foreground">{fmt(rentCall.total_amount)}</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            rentCall.paid ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
          }`}>
            {rentCall.paid ? "Payé" : "En attente"}
          </span>
        </div>
      </div>
    </div>
  );
}

function QuittancesTab({ quittances, paidCalls, fmt, generateReceiptForPayment, tenants }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <AppCardTitle lines={1}>Quittances de loyer</AppCardTitle>
      </div>

      <div className="rounded-2xl p-3 bg-primary/5 border border-primary/10">
        <p className="text-[11px] text-muted-foreground">
          Les quittances sont générées automatiquement à chaque paiement validé. Vous pouvez aussi les générer manuellement ci-dessous.
        </p>
      </div>

      {paidCalls.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Paiements éligibles à quittance</h4>
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
                <div className="flex items-center gap-2">
                  {rc.receipt_pdf_url ? (
                    <a href={rc.receipt_pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 active:scale-95 transition-transform">
                      <Download className="w-3 h-3" /> PDF
                    </a>
                  ) : (
                    <button
                      onClick={() => generateReceiptForPayment(rc)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold active:scale-95 transition-transform"
                      style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
                    >
                      <FileText className="w-3 h-3" /> Générer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {quittances.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Documents générés</h4>
          {quittances.map((doc: any) => (
            <div key={doc.id} className="rounded-2xl p-3.5 bg-card border border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{doc.title || "Quittance"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString("fr-FR") : "—"}
                  </p>
                </div>
              </div>
              {doc.file_url && (
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 active:scale-95 transition-transform">
                  <Download className="w-3 h-3" /> PDF
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {quittances.length === 0 && paidCalls.length === 0 && (
        <EmptyState icon={Receipt} message="Aucune quittance" sub="Les quittances sont générées après validation du paiement" />
      )}
    </div>
  );
}

function PaiementsTab({ propRentCalls, fmt, togglePayment, tenants }: any) {
  const unpaid = propRentCalls.filter((r: any) => !r.paid);
  const paid = propRentCalls.filter((r: any) => r.paid);

  return (
    <div className="space-y-4">
      {unpaid.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> En attente ({unpaid.length})
          </h3>
          {unpaid.map((rc: any) => {
            const monthLabel = rc.month ? new Date(rc.month + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—";
            const tenant = tenants.find((t: any) => t.id === rc.tenant_id);
            return (
              <div key={rc.id} className="rounded-2xl p-3.5 bg-card border border-destructive/20">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <p className="text-sm font-semibold text-foreground capitalize">{monthLabel}</p>
                    <p className="text-[10px] text-muted-foreground">{tenant?.name || "Locataire"}</p>
                  </div>
                  <p className="text-sm font-bold text-destructive">{fmt(rc.total_amount)}</p>
                </div>
                <button
                  onClick={() => togglePayment(rc.id)}
                  className="w-full py-2 rounded-xl text-xs font-semibold text-primary-foreground active:scale-[0.98] transition-transform"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" /> Marquer payé
                </button>
              </div>
            );
          })}
        </div>
      )}

      {paid.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-500" /> Payés ({paid.length})
          </h3>
          {paid.map((rc: any) => {
            const monthLabel = rc.month ? new Date(rc.month + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—";
            const tenant = tenants.find((t: any) => t.id === rc.tenant_id);
            return (
              <div key={rc.id} className="rounded-2xl p-3.5 bg-card border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground capitalize">{monthLabel}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {tenant?.name || "—"} &middot; {rc.paid_date ? new Date(rc.paid_date).toLocaleDateString("fr-FR") : "—"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">{fmt(rc.total_amount)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {propRentCalls.length === 0 && (
        <EmptyState icon={CreditCard} message="Aucun paiement" sub="Les paiements apparaissent après la génération des appels de loyer" />
      )}
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

function LeaseStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "bg-emerald-500/10", text: "text-emerald-600", label: "Actif" },
    draft: { bg: "bg-muted", text: "text-muted-foreground", label: "Brouillon" },
    pending_signature: { bg: "bg-amber-500/10", text: "text-amber-600", label: "Signature" },
    archived: { bg: "bg-muted", text: "text-muted-foreground", label: "Archivé" },
    terminated: { bg: "bg-destructive/10", text: "text-destructive", label: "Résilié" },
  };
  const c = config[status] || config.draft;
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>;
}
