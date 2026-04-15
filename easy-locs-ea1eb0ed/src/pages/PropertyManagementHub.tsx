/**
 * PropertyManagementHub — Unified hub with 3 verticals:
 * Hotel, Location Saisonnière, Location Long Terme.
 * Route: /property-hub
 */
import { useState, useEffect, useCallback } from "react";
import SecurityGate from "@/components/security/SecurityGate";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import SubPageShell from "@/components/layout/SubPageShell";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/ui/error-state";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { usePlatformCurrency } from "@/hooks/usePlatformCurrency";
import {
  fetchPropertyHubOverview,
  fetchSeasonalHubStats,
  fetchHotelHubStats,
} from "@/repositories/property-management-hub.repository";
import { format } from "date-fns";
import {
  Building2, Home, Users, Receipt, Wrench, FileText, Calculator,
  Megaphone, Building, TrendingUp, Plus, ChevronRight, KeyRound,
  Hotel, Palmtree, CalendarDays, BedDouble, Clock, LogIn,
  ClipboardList, Wallet, User, DollarSign, Scale, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiEngine } from "@/hooks/useUiEngine";

type HubSection = null | "hotel" | "seasonal" | "longterm";

const VALID_SECTIONS: HubSection[] = ["hotel", "seasonal", "longterm"];

const hotelNav = [
  { label: "Hotel Dashboard", desc: "Full management console", icon: Hotel, path: "/hotel/dashboard" },
  { label: "Calendar", desc: "Room availability & bookings", icon: CalendarDays, path: "/hotel/calendar" },
  { label: "Rooms", desc: "Room types & inventory", icon: BedDouble, path: "/hotel/rooms" },
  { label: "Pricing", desc: "Rates & seasonal pricing", icon: TrendingUp, path: "/hotel/pricing" },
];

const seasonalNav = [
  { label: "Reservations", desc: "Calendar & bookings", icon: CalendarDays, path: "/property-hub/seasonal/reservations" },
  { label: "Channel Manager", desc: "OTA sync & distribution", icon: Megaphone, path: "/dashboard/channels" },
  { label: "Dynamic Pricing", desc: "Rate optimization", icon: TrendingUp, path: "/dashboard/dynamic-pricing" },
  { label: "Documents", desc: "Traveler documents", icon: FileText, path: "/dashboard/documents" },
];

const longTermNav = [
  { label: "Portfolio", desc: "All your properties", icon: Building2, path: "/dashboard/properties" },
  { label: "Buildings & Units", desc: "Units & floors", icon: Home, path: "/dashboard/buildings" },
  { label: "Tenants", desc: "Tenant directory", icon: Users, path: "/dashboard/tenants" },
  { label: "Leases", desc: "Contracts & signatures", icon: KeyRound, path: "/dashboard/leases" },
  { label: "Rent Cockpit", desc: "Payments & status tracking", icon: Receipt, path: "/dashboard/rent-cockpit" },
  { label: "Payment Notices", desc: "Quittances & rent receipts", icon: ClipboardList, path: "/dashboard/payment-notices" },
  { label: "Dunning Letters", desc: "Mise en demeure & résiliation", icon: Scale, path: "/dashboard/dunning-letters" },
  { label: "Maintenance", desc: "Requests & interventions", icon: Wrench, path: "/dashboard/interventions" },
  { label: "Documents", desc: "Bail, quittances, contracts", icon: FileText, path: "/dashboard/documents" },
  { label: "Accounting", desc: "Revenue & expenses", icon: Calculator, path: "/dashboard/accounting" },
  { label: "Accounting Entries", desc: "Lease-linked ledger", icon: Calculator, path: "/dashboard/accounting-entries" },
  { label: "Publish Listings", desc: "Advertise vacancies", icon: Megaphone, path: "/dashboard/real-estate" },
];

const tenantNav = [
  { label: "My Property", desc: "Your current home", icon: Home, path: "/dashboard" },
  { label: "My Rent", desc: "Receipts & history", icon: Receipt, path: "/my-orders" },
  { label: "Payments", desc: "Pay rent & bills", icon: Wallet, path: "/wallet" },
  { label: "Maintenance Requests", desc: "Report issues", icon: Wrench, path: "/support/tickets" },
  { label: "Documents", desc: "Lease & shared files", icon: FileText, path: "/dashboard/documents" },
];

interface HubStats {
  totalProperties: number;
  revenueThisMonth: number;
  hotelStats: { hasHotel: boolean; occupancyPercent: number; monthRevenue: number; pendingBookings: number; totalRooms: number; revPAR: number; bookingsToday: number };
  seasonalStats: { totalBookings: number; activeNow: number; pendingRequests: number; monthRevenue: number };
}

export default function PropertyManagementHub() {
  useUiEngine("propertymanagementhub");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection = VALID_SECTIONS.includes(searchParams.get("section") as HubSection)
    ? (searchParams.get("section") as HubSection)
    : null;
  const [section, setSection] = useState<HubSection>(initialSection);
  const [isTenant, setIsTenant] = useState(searchParams.get("view") === "tenant");
  const navigate = useNavigate();
  const location = useLocation();
  const { orgId, user } = useAuth();
  const { t } = useI18n();
  const { fmtLocal } = usePlatformCurrency();

  useEffect(() => {
    const s = searchParams.get("section") as HubSection;
    const v = searchParams.get("view");
    if (VALID_SECTIONS.includes(s)) {
      setSection(s);
      setIsTenant(false);
    } else if (v === "tenant") {
      setSection(null);
      setIsTenant(true);
    } else if (!s && !v) {
      setSection(null);
      setIsTenant(false);
    }
  }, [searchParams]);

  const [stats, setStats] = useState<HubStats>({
    totalProperties: 0,
    revenueThisMonth: 0,
    hotelStats: { hasHotel: false, occupancyPercent: 0, monthRevenue: 0, pendingBookings: 0, totalRooms: 0, revPAR: 0, bookingsToday: 0 },
    seasonalStats: { totalBookings: 0, activeNow: 0, pendingRequests: 0, monthRevenue: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!orgId || !user?.id) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => setLoading(false), 8000);

    Promise.all([
      fetchPropertyHubOverview(orgId),
      fetchSeasonalHubStats(orgId).catch(() => ({ totalBookings: 0, activeNow: 0, pendingRequests: 0, monthRevenue: 0 })),
      fetchHotelHubStats(user.id).catch(() => ({ hasHotel: false, occupancyPercent: 0, monthRevenue: 0, pendingBookings: 0, totalRooms: 0, revPAR: 0, bookingsToday: 0 })),
    ]).then(([hubData, seasonalData, hotelData]) => {
      clearTimeout(timeout);
      const currentMonth = format(new Date(), "yyyy-MM");
      const monthCalls = (hubData.rentCalls || []).filter((r: { month: string; paid: boolean; total_amount: number | string }) => r.month === currentMonth);
      const longTermRevenue = monthCalls.filter((r) => r.paid).reduce((sum: number, r) => sum + Number(r.total_amount || 0), 0);
      const totalRevenue = longTermRevenue + seasonalData.monthRevenue + hotelData.monthRevenue;

      setStats({
        totalProperties: hubData.properties.length,
        revenueThisMonth: totalRevenue,
        hotelStats: hotelData,
        seasonalStats: seasonalData,
      });
      setLoading(false);
    }).catch((err) => {
      clearTimeout(timeout);
      console.error("[PropertyHub] data fetch error:", err);
      setError("Failed to load data");
      setLoading(false);
    });

    return () => clearTimeout(timeout);
  }, [orgId, user?.id, reloadKey]);

  useEffect(() => {
    if ((location.state as { propertyHubExit?: boolean } | null)?.propertyHubExit) {
      setSection(null);
      setIsTenant(false);
      window.scrollTo(0, 0);
    }
  }, [location.state]);

  const selectSection = useCallback((s: HubSection) => {
    setSection(s);
    if (s) {
      setSearchParams({ section: s }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams]);

  const goHome = useCallback(() => {
    setSection(null);
    setIsTenant(false);
    setSearchParams({}, { replace: true });
    window.scrollTo(0, 0);
  }, [setSearchParams]);

  const navItems =
    isTenant ? tenantNav :
    section === "hotel" ? hotelNav :
    section === "seasonal" ? seasonalNav :
    section === "longterm" ? longTermNav :
    [];

  const sectionTitle =
    isTenant ? "Tenant Hub" :
    section === "hotel" ? "Hôtel" :
    section === "seasonal" ? "Location Saisonnière" :
    section === "longterm" ? "Location Long Terme" :
    "Gestion Immo";

  const totalOccupiedUnits = stats.seasonalStats.activeNow + (stats.hotelStats.hasHotel
    ? Math.round(stats.hotelStats.occupancyPercent * stats.hotelStats.totalRooms / 100)
    : 0);
  const totalUnits = stats.totalProperties + stats.hotelStats.totalRooms;
  const aggregatedOccupancy = totalUnits > 0 ? Math.round((totalOccupiedUnits / totalUnits) * 100) : 0;

  const kpis = [
    { icon: Building, label: "Properties", value: String(stats.totalProperties), sub: "Total portfolio" },
    { icon: DollarSign, label: "Revenue", value: fmtLocal(stats.revenueThisMonth), sub: "This month (all)" },
    { icon: BarChart3, label: "Occupancy", value: `${aggregatedOccupancy}%`, sub: `${totalOccupiedUnits}/${totalUnits} units` },
    { icon: CalendarDays, label: "Active Guests", value: String(stats.seasonalStats.activeNow + stats.hotelStats.bookingsToday), sub: "Seasonal + hotel today" },
  ];

  return (
    <SecurityGate label="Property Management" timeoutMinutes={10}>
      <>
        <SEOHead title="Gestion Immo" description="Unified property management hub — Hotel, Seasonal & Long Term rentals." />
        <SubPageShell noContentPad>
          <MobilePageHeader
            title={sectionTitle}
            icon={<Building2 className="h-5 w-5 text-primary" />}
            backTo="/dashboard"
            onBack={(section || isTenant) ? goHome : undefined}
          />

          <div className="max-w-lg mx-auto px-4 py-4">
            {!section && !isTenant && (
              <div className="space-y-6">
                <div className="text-center space-y-2 pt-2">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto shadow-lg shadow-primary/10">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Gestion Immo</h2>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Your unified property management hub
                  </p>
                </div>

                {error && !loading && (
                  <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} className="mb-4" />
                )}

                <div className="grid grid-cols-2 gap-2">
                  {kpis.map((kpi, i) => (
                    <motion.div
                      key={kpi.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + i * 0.04 }}
                    >
                      <StatCard icon={kpi.icon} label={kpi.label} value={kpi.value} sub={kpi.sub} loading={loading} />
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Property Verticals</h3>

                  <SectionCard
                    icon={Hotel}
                    title="Hôtel"
                    desc={stats.hotelStats.hasHotel
                      ? "Rooms, bookings, pricing & occupancy"
                      : "Set up your hotel to start managing rooms & bookings"}
                    accent="from-blue-500/20 to-blue-500/5"
                    iconColor="text-blue-500"
                    onClick={() => selectSection("hotel")}
                    badges={stats.hotelStats.hasHotel ? [
                      { label: `${stats.hotelStats.occupancyPercent}% occ.`, color: "bg-blue-500/10 text-blue-600" },
                      ...(stats.hotelStats.pendingBookings > 0
                        ? [{ label: `${stats.hotelStats.pendingBookings} pending`, color: "bg-amber-500/10 text-amber-600" }]
                        : []),
                    ] : [
                      { label: "Not configured", color: "bg-muted text-muted-foreground" },
                    ]}
                    loading={loading}
                  />

                  <SectionCard
                    icon={Palmtree}
                    title="Location Saisonnière"
                    desc="Short-stay bookings, calendar, iCal sync"
                    accent="from-emerald-500/20 to-emerald-500/5"
                    iconColor="text-emerald-500"
                    onClick={() => selectSection("seasonal")}
                    badges={[
                      { label: `${stats.seasonalStats.activeNow} active`, color: "bg-emerald-500/10 text-emerald-600" },
                      ...(stats.seasonalStats.pendingRequests > 0
                        ? [{ label: `${stats.seasonalStats.pendingRequests} pending`, color: "bg-amber-500/10 text-amber-600" }]
                        : []),
                    ]}
                    loading={loading}
                  />

                  <SectionCard
                    icon={KeyRound}
                    title="Location Long Terme"
                    desc="Properties, tenants, leases, rent & maintenance"
                    accent="from-primary/20 to-primary/5"
                    iconColor="text-primary"
                    onClick={() => selectSection("longterm")}
                    badges={[
                      { label: `${stats.totalProperties} properties`, color: "bg-primary/10 text-primary" },
                    ]}
                    loading={loading}
                  />

                  <div className="pt-2">
                    <button
                      onClick={() => { setIsTenant(true); setSearchParams({ view: "tenant" }, { replace: true }); }}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl",
                        "bg-card border border-border/50",
                        "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10",
                        "active:scale-[0.98] transition-all duration-200 group cursor-pointer"
                      )}
                    >
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center shrink-0">
                        <User className="h-6 w-6 text-secondary-foreground" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-bold">Tenant Access</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">View rent, payments, documents & requests</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-all" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(section || isTenant) && (
              <div className="space-y-4">
                {section === "hotel" && !stats.hotelStats.hasHotel && !loading && (
                  <div className="text-center p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                    <Hotel className="h-10 w-10 text-blue-500/60 mx-auto mb-3" />
                    <p className="text-sm font-semibold mb-1">No hotel configured yet</p>
                    <p className="text-xs text-muted-foreground mb-4">Create your hotel to start managing rooms, bookings and pricing.</p>
                    <Link
                      to="/hotel/dashboard"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Set Up Hotel
                    </Link>
                  </div>
                )}

                {section === "hotel" && stats.hotelStats.hasHotel && (
                  <SectionKpis items={[
                    { icon: BedDouble, label: "Occupancy", value: `${stats.hotelStats.occupancyPercent}%`, sub: `${stats.hotelStats.totalRooms} rooms` },
                    { icon: BarChart3, label: "RevPAR", value: fmtLocal(stats.hotelStats.revPAR), sub: "Revenue per room" },
                    { icon: LogIn, label: "Bookings Today", value: String(stats.hotelStats.bookingsToday), sub: "Check-ins" },
                    { icon: TrendingUp, label: "Revenue", value: fmtLocal(stats.hotelStats.monthRevenue), sub: "This month" },
                    { icon: Clock, label: "Pending", value: String(stats.hotelStats.pendingBookings), sub: "To confirm" },
                    { icon: BedDouble, label: "Total Rooms", value: String(stats.hotelStats.totalRooms), sub: "Inventory" },
                  ]} loading={loading} />
                )}

                {section === "seasonal" && (
                  <SectionKpis items={[
                    { icon: CalendarDays, label: "Bookings", value: String(stats.seasonalStats.totalBookings), sub: "All time" },
                    { icon: Palmtree, label: "Active Now", value: String(stats.seasonalStats.activeNow), sub: "Current guests" },
                    { icon: Clock, label: "Pending", value: String(stats.seasonalStats.pendingRequests), sub: "Requests" },
                    { icon: TrendingUp, label: "Revenue", value: fmtLocal(stats.seasonalStats.monthRevenue), sub: "This month" },
                  ]} loading={loading} />
                )}

                {section === "longterm" && (
                  <>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <StatCard icon={Building} label="Properties" value={String(stats.totalProperties)} sub="Portfolio" loading={loading} />
                      <StatCard icon={TrendingUp} label="Revenue" value={fmtLocal(stats.revenueThisMonth - stats.seasonalStats.monthRevenue - stats.hotelStats.monthRevenue)} sub="Long term · month" loading={loading} />
                    </div>
                    <Link
                      to="/dashboard/property/add"
                      className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all mb-2"
                    >
                      <Plus className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-muted-foreground">Add a Property</span>
                    </Link>
                  </>
                )}

                {(section !== "hotel" || stats.hotelStats.hasHotel) && (
                  <div className="space-y-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.path}
                          onClick={() => navigate(item.path)}
                          className={cn(
                            "w-full flex items-center gap-3.5 p-3.5 rounded-xl",
                            "bg-card border border-border/40",
                            "hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5",
                            "active:scale-[0.98] transition-all duration-200 group cursor-pointer"
                          )}
                        >
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-semibold line-clamp-1 break-words">{item.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-all shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </SubPageShell>
      </>
    </SecurityGate>
  );
}

function SectionCard({
  icon: Icon, title, desc, accent, iconColor, onClick, badges, loading,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  accent: string;
  iconColor: string;
  onClick: () => void;
  badges?: { label: string; color: string }[];
  loading?: boolean;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-5 rounded-2xl text-left",
        "bg-card border border-border/50",
        "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10",
        "active:scale-[0.98] transition-all duration-200 group cursor-pointer"
      )}
    >
      <div className={cn("h-14 w-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0", accent)}>
        <Icon className={cn("h-7 w-7", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
        {!loading && badges && badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {badges.map((b, i) => (
              <span key={i} className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", b.color)}>
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-all shrink-0" />
    </motion.button>
  );
}

function SectionKpis({
  items,
  loading,
}: {
  items: { icon: React.ElementType; label: string; value: string; sub: string }[];
  loading?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-2">
      {items.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 + i * 0.04 }}
        >
          <StatCard icon={kpi.icon} label={kpi.label} value={kpi.value} sub={kpi.sub} loading={loading} />
        </motion.div>
      ))}
    </div>
  );
}
