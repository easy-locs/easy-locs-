import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { useRentalData, type Property, type Tenant, type RentCall } from "@/hooks/useRentalData";
import { formatCurrency } from "@/lib/country-config";
import { tenantService } from "@/services/property.service";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Building2, Users, TrendingUp, AlertTriangle, CheckCircle,
  Plus, Home, Key, Wallet, ChevronRight, MapPin, UserCheck, UserX,
  Receipt, Clock, CreditCard, Eye, Zap, BarChart3, ArrowUpRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

type Role = "bailleur" | "locataire";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } },
};

export default function MePropertyHub() {
  useUiEngine("me-mepropertyhub");
  const navigate = useNavigate();
  const { user, orgId, userCountry } = useAuth();
  const { t } = useI18n();
  const fmt = useCallback((n: number) => formatCurrency(n, userCountry), [userCountry]);

  const { properties, tenants, rentCalls, loading } = useRentalData();
  const [role, setRole] = useState<Role>("bailleur");

  const { data: tenantProfile , isError } = useQuery({
    queryKey: ["me-tenant-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      return tenantService.fetchByTenantUserId(user?.id);
    },
  });

  const today = new Date().toISOString().split("T")[0];

  const stats = useMemo(() => {
    const totalRent = tenants.reduce((s, t) => s + (t.rent_amount || 0) + (t.charges_amount || 0), 0);
    const unpaid = rentCalls.filter(r => !r.paid);
    const unpaidAmount = unpaid.reduce((s, r) => s + (r.total_amount || 0), 0);
    const occupied = new Set(tenants.filter(t => t.property_id && (!t.lease_end || t.lease_end >= today)).map(t => t.property_id)).size;
    const vacant = properties.length - occupied;
    const paidThisMonth = rentCalls.filter(r => r.paid).reduce((s, r) => s + (r.total_amount || 0), 0);
    return { totalRent, unpaidCount: unpaid.length, unpaidAmount, occupied, vacant, paidThisMonth, total: properties.length };
  }, [properties, tenants, rentCalls, today]);

  const propertyCards = useMemo(() => {
    return properties.map(prop => {
      const propTenants = tenants.filter(t => t.property_id === prop.id && (!t.lease_end || t.lease_end >= today));
      const propRents = rentCalls.filter(r => r.property_id === prop.id);
      const unpaid = propRents.filter(r => !r.paid);
      const lastPaid = propRents.filter(r => r.paid).sort((a, b) => (b.month || "").localeCompare(a.month || ""))[0];
      return { ...prop, tenants: propTenants, unpaidCount: unpaid.length, unpaidAmount: unpaid.reduce((s, r) => s + r.total_amount, 0), lastPaidMonth: lastPaid?.month };
    });
  }, [properties, tenants, rentCalls, today]);

  const hasTenantsView = (tenantProfile?.length ?? 0) > 0;

  if (loading) {
    if (isError) return (<div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>);

  return (
      <SubPageShell className="max-w-md mx-auto px-4 py-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-24 w-full mb-3" />
        <Skeleton className="h-24 w-full mb-3" />
        <Skeleton className="h-48 w-full" />
      </SubPageShell>
    );
  }

  return (
    <SubPageShell className="max-w-md mx-auto px-4 py-4">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">

        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <button onClick={() => navigate("/me")} className="p-2 rounded-xl bg-muted/50 active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Gestion Immo</h1>
            <p className="text-xs text-muted-foreground">{properties.length} {properties.length > 1 ? "biens" : "bien"} &middot; {tenants.length} locataires</p>
          </div>
          <button
            onClick={() => navigate("/dashboard/property/add")}
            className="p-2.5 rounded-xl active:scale-95 transition-transform bg-primary/10"
          >
            <Plus className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
          </button>
        </motion.div>

        {hasTenantsView && (
          <motion.div variants={fadeUp} className="flex gap-2 p-1 rounded-2xl bg-muted/50">
            {(["bailleur", "locataire"] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  role === r ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                {r === "bailleur" ? "Bailleur" : "Locataire"}
              </button>
            ))}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {role === "bailleur" ? (
            <motion.div key="bailleur" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <StatCard icon={Wallet} label="Loyers mensuels" value={fmt(stats.totalRent)} color="hsl(152 60% 42%)" />
                <StatCard icon={AlertTriangle} label="Impayés" value={`${stats.unpaidCount}`} sub={fmt(stats.unpaidAmount)} color="hsl(0 72% 51%)" alert={stats.unpaidCount > 0} />
                <StatCard icon={Building2} label="Occupés" value={`${stats.occupied}/${stats.total}`} color="hsl(210 80% 52%)" />
                <StatCard icon={TrendingUp} label="Encaissé" value={fmt(stats.paidThisMonth)} color="hsl(var(--warning))" />
              </div>

              <div className="flex gap-2">
                <QuickAction icon={Zap} label="Appels de loyer" onClick={() => navigate("/dashboard/rent-cockpit")} color="hsl(270 60% 55%)" />
                <QuickAction icon={Users} label="Locataires" onClick={() => navigate("/dashboard/rental-management?tab=tenants")} color="hsl(210 80% 52%)" />
                <QuickAction icon={Key} label="Baux" onClick={() => navigate("/dashboard/leases")} color="hsl(152 60% 42%)" />
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-bold text-foreground px-1">Mes biens</h2>
                {propertyCards.length === 0 ? (
                  <EmptyProperties onAdd={() => navigate("/dashboard/property/add")} />
                ) : (
                  propertyCards.map(prop => (
                    <PropertyCard
                      key={prop.id}
                      property={prop}
                      fmt={fmt}
                      onClick={() => navigate(`/me/gestion-immo/${prop.id}`)}
                    />
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key="locataire" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <TenantDashboard tenantProfile={tenantProfile} fmt={fmt} navigate={navigate} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </SubPageShell>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, alert }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string; value: string; sub?: string; color: string; alert?: boolean;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl p-3.5 relative overflow-hidden"
      style={{ background: `color-mix(in srgb, ${color} 4%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 8%, transparent)` }}
    >
      {alert && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive animate-pulse" />}
      <Icon className="w-5 h-5 mb-2" style={{ color }} />
      <p className="text-lg font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] font-semibold text-destructive">{sub}</p>}
      <p className="text-[10px] text-muted-foreground font-medium mt-0.5 uppercase tracking-wide">{label}</p>
    </motion.div>
  );
}

function QuickAction({ icon: Icon, label, onClick, color }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl active:scale-95 transition-transform"
      style={{ background: `color-mix(in srgb, ${color} 4%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 6%, transparent)` }}
    >
      <Icon className="w-5 h-5" style={{ color }} />
      <span className="text-[10px] font-semibold text-foreground text-center leading-tight">{label}</span>
    </button>
  );
}

function PropertyCard({ property, fmt, onClick }: {
  property: Property & { tenants: Tenant[]; unpaidCount: number; unpaidAmount: number; lastPaidMonth?: string };
  fmt: (n: number) => string;
  onClick: () => void;
}) {
  const isOccupied = property.tenants.length > 0;
  const monthlyTotal = property.monthly_rent + property.monthly_charges;

  return (
    <motion.button
      variants={fadeUp}
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 active:scale-[0.98] transition-all bg-card border border-border relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.03] pointer-events-none" style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }} />

      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
          style={{ background: isOccupied ? "hsl(152 60% 42% / 0.1)" : "hsl(0 0% 100% / 0.06)" }}
        >
          {property.photo_urls?.[0] ? (
            <img loading="lazy" src={property.photo_urls[0]} alt="" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <Home className="w-5 h-5" style={{ color: isOccupied ? "hsl(152 60% 42%)" : "hsl(215 15% 50%)" }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground line-clamp-1 break-words">{property.label}</p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              isOccupied ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
            }`}>
              {isOccupied ? "Occupé" : "Vacant"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{property.address}, {property.city}</span>
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs font-semibold text-foreground">{fmt(monthlyTotal)}<span className="text-muted-foreground font-normal">/mois</span></span>
            {property.tenants.length > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" /> {property.tenants.length} {property.tenants.length > 1 ? "locataires" : "locataire"}
              </span>
            )}
            {property.unpaidCount > 0 && (
              <span className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {property.unpaidCount} impayé{property.unpaidCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
      </div>
    </motion.button>
  );
}

function EmptyProperties({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
        <Building2 className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">Aucun bien</p>
      <p className="text-xs text-muted-foreground mb-4">Ajoutez votre premier bien pour commencer</p>
      <button
        onClick={onAdd}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground active:scale-95 transition-transform"
        style={{ background: "hsl(var(--primary))" }}
      >
        <Plus className="w-4 h-4 inline mr-1.5" /> Ajouter un bien
      </button>
    </div>
  );
}

function TenantDashboard({ tenantProfile, fmt, navigate }: {
  tenantProfile: any[] | undefined;
  fmt: (n: number) => string;
  navigate: (path: string) => void;
}) {
  if (!tenantProfile || tenantProfile.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
          <UserX className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-1">Pas de location active</p>
        <p className="text-xs text-muted-foreground">Vous n'êtes associé à aucun bail en tant que locataire</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tenantProfile.map((tp: any) => {
        const prop = tp.properties;
        return (
          <div key={tp.id} className="space-y-3">
            <div className="rounded-2xl p-4 bg-card border border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Home className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground line-clamp-1 break-words">{prop?.label || "Mon logement"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{prop?.address}, {prop?.city}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-xl p-2.5 bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Loyer</p>
                  <p className="text-sm font-bold text-foreground">{fmt(tp.rent_amount + (tp.charges_amount || 0))}</p>
                </div>
                <div className="rounded-xl p-2.5 bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Bail</p>
                  <p className="text-sm font-bold text-foreground">
                    {tp.lease_type === "furnished" ? "Meublé" : tp.lease_type === "commercial" ? "Commercial" : "Nu"}
                  </p>
                </div>
              </div>

              {tp.lease_start && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Depuis le {new Date(tp.lease_start).toLocaleDateString("fr-FR")}</span>
                  {tp.lease_end && <span className="text-destructive"> &middot; Fin: {new Date(tp.lease_end).toLocaleDateString("fr-FR")}</span>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => navigate("/me/tenant-view")}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border active:scale-95 transition-transform"
              >
                <Receipt className="w-5 h-5 text-emerald-500" />
                <span className="text-[10px] font-semibold text-foreground">Quittances</span>
              </button>
              <button
                onClick={() => navigate("/me/tenant-view")}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border active:scale-95 transition-transform"
              >
                <CreditCard className="w-5 h-5 text-blue-500" />
                <span className="text-[10px] font-semibold text-foreground">Paiements</span>
              </button>
              <button
                onClick={() => navigate("/me/tenant-view")}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border active:scale-95 transition-transform"
              >
                <Key className="w-5 h-5 text-amber-500" />
                <span className="text-[10px] font-semibold text-foreground">Mon bail</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
