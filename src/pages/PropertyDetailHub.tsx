import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { fetchPropertyHubData } from "@/repositories/property-hub.repository";
import { getCountryConfig, formatCurrency } from "@/lib/country-config";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import EntityActivityLog from "@/components/communication/EntityActivityLog";
import { Button } from "@/components/ui/button";
import {
  Home, Users, FileText, Wallet, Wrench, ClipboardList,
  Calendar, MapPin, Ruler, Thermometer, Key, Building2,
  TrendingUp, AlertTriangle, CheckCircle, Eye, Sofa,
  CalendarRange, Store, ChevronRight, ExternalLink,
  Plus, Receipt, ShieldCheck, Tag, Activity,
  DollarSign, Megaphone
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PropertyHubBreadcrumb from "@/components/property/PropertyHubBreadcrumb";

type PropertyDetail = {
  id: string;
  label: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  property_type: string;
  surface: number;
  rooms: number;
  floor?: number | null;
  heating: string;
  furnished: boolean;
  monthly_rent: number;
  monthly_charges: number;
  deposit_amount: number;
  notes: string;
  photo_urls?: any;
};

const PropertyDetailHub = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { orgId, userCountry } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [rentCalls, setRentCalls] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [inventories, setInventories] = useState<any[]>([]);
  const [seasonalListings, setSeasonalListings] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [realEstateListings, setRealEstateListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const country = property?.country || userCountry || "FR";
  const cc = useMemo(() => getCountryConfig(country), [country]);
  const fmt = useCallback((n: number) => formatCurrency(n, country), [country]);
  const countryEntry = getCountryEntryOrDefault(country);

  useEffect(() => {
    if (!propertyId || !orgId) return;
    loadAll();
  }, [propertyId, orgId]);

  const loadAll = async () => {
    if (!propertyId || !orgId) return;
    setLoading(true);
    const result = await fetchPropertyHubData(propertyId, orgId);
    setProperty(result.property);
    setTenants(result.tenants);
    setRentCalls(result.rentCalls);
    setLeases(result.leases);
    setExpenses(result.expenses);
    setInterventions(result.interventions);
    setInventories(result.inventories);
    setSeasonalListings(result.seasonalListings);
    setRealEstateListings(result.realEstateListings);
    setDocuments(result.documents);
    setLoading(false);
  };

  // Stats
  const today = new Date().toISOString().split("T")[0];
  const activeTenants = tenants.filter(t => !t.lease_end || t.lease_end >= today);
  const unpaidRents = rentCalls.filter(r => !r.paid);
  const totalRevenue = rentCalls.filter(r => r.paid).reduce((s, r) => s + (r.total_amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const openInterventions = interventions.filter(i => i.status !== "completed" && i.status !== "cancelled");

  // Modes
  const hasLongTerm = activeTenants.length > 0 || leases.length > 0;
  const hasSeasonal = seasonalListings.length > 0;
  const hasForSale = realEstateListings.some((r: any) => r.listing_type === "sale" && r.status === "active");

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!property) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Home className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-bold text-foreground">{t("page.property.not_found") || "Property not found"}</h2>
          <Link to="/dashboard/rental" className="text-accent hover:underline text-sm mt-2">
            ← {t("page.property.back_to_list") || "Back to properties"}
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const propertyType = cc.propertyTypes.find(p => p.value === property.property_type)?.label || property.property_type;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb + header */}
        <div>
          <PropertyHubBreadcrumb currentPage={property.label} />
          <button onClick={() => navigate("/dashboard/properties")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
            <ChevronRight className="h-4 w-4 rotate-180" /> {t("page.property.back_to_list") || "Back to properties"}
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Property photo or placeholder */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
              {property.photo_urls?.[0] ? (
                <img src={property.photo_urls[0]} alt={property.label} className="w-full h-full object-cover" />
              ) : (
                <Home className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{property.label}</h1>
                <span className="text-lg">{countryEntry.flag}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {property.address}, {property.postal_code} {property.city}</span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {propertyType}</span>
                {property.surface > 0 && (
                  <>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" /> {property.surface} m²</span>
                  </>
                )}
                {property.rooms > 0 && (
                  <>
                    <span className="text-border">|</span>
                    <span>{property.rooms} {t("page.property.rooms") || "rooms"}</span>
                  </>
                )}
              </div>
              {/* Occupancy + mode badges */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {property.furnished && <Badge variant="secondary" className="text-xs">{t("page.property.furnished") || "Furnished"}</Badge>}
                {activeTenants.length > 0 ? (
                  <Badge className="bg-success/10 text-success border-success/20 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" /> {t("page.property.occupied") || "Occupied"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {t("page.property.vacant") || "Vacant"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 1. Listings / Modes strip ── */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
            {t("page.property.active_modes") || "Active Modes"}
          </h3>
          <div className="flex flex-wrap gap-2">
            <ModeChip active={hasLongTerm} icon={Key} label={t("page.property.mode_longterm") || "Long-term rental"} />
            <ModeChip active={hasSeasonal} icon={CalendarRange} label={t("page.property.mode_seasonal") || "Seasonal rental"} />
            <ModeChip active={hasForSale} icon={Tag} label={t("page.property.mode_sale") || "For sale"} />
          </div>
        </div>

        {/* ── 2. Quick action buttons ── */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: t("page.property.add_tenant") || "Add tenant", icon: Users, path: `/dashboard/tenants?property=${propertyId}` },
            { label: t("page.property.create_lease") || "Create lease", icon: FileText, path: `/dashboard/leases?property=${propertyId}` },
            { label: t("page.property.generate_receipt") || "Generate receipt", icon: Receipt, path: `/dashboard/receipts?property=${propertyId}` },
            { label: t("page.property.add_expense") || "Add expense", icon: DollarSign, path: `/dashboard/expenses?property=${propertyId}` },
            { label: t("page.property.add_intervention") || "Report issue", icon: Wrench, path: `/dashboard/interventions?property=${propertyId}` },
            { label: t("page.property.publish_seasonal") || "Publish seasonal", icon: CalendarRange, path: `/dashboard/seasonal?property=${propertyId}` },
            { label: t("page.property.publish_sale") || "Publish for sale", icon: Megaphone, path: `/dashboard/real-estate?property=${propertyId}` },
          ].map(a => (
            <Button key={a.label} variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(a.path)}>
              <a.icon className="h-3.5 w-3.5" /> {a.label}
            </Button>
          ))}
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            { label: t("page.property.rent") || "Monthly Rent", value: fmt(property.monthly_rent + property.monthly_charges), icon: Wallet, color: "text-accent" },
            { label: t("page.property.tenants") || "Active Tenants", value: String(activeTenants.length), icon: Users, color: "text-success" },
            { label: t("page.property.unpaid") || "Unpaid", value: String(unpaidRents.length), icon: AlertTriangle, color: unpaidRents.length > 0 ? "text-destructive" : "text-muted-foreground" },
            { label: t("page.property.revenue") || "Revenue", value: fmt(totalRevenue), icon: TrendingUp, color: "text-success" },
            { label: t("page.property.expenses_total") || "Expenses", value: fmt(totalExpenses), icon: Wallet, color: "text-destructive" },
          ].map((kpi, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-[11px] text-muted-foreground font-medium">{kpi.label}</span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-foreground">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Tabbed content */}
        <Tabs defaultValue="tenants" className="w-full">
          <TabsList className="w-full flex overflow-x-auto gap-1 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="tenants" className="flex items-center gap-1.5 text-xs sm:text-sm min-w-[44px]">
              <Users className="h-3.5 w-3.5" /> {t("nav.tenants") || "Tenants"}
              {activeTenants.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{activeTenants.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1.5 text-xs sm:text-sm min-w-[44px]">
              <Wallet className="h-3.5 w-3.5" /> {t("nav.payments") || "Payments"}
              {unpaidRents.length > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{unpaidRents.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1.5 text-xs sm:text-sm min-w-[44px]">
              <FileText className="h-3.5 w-3.5" /> {t("nav.documents") || "Documents"}
              {documents.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{documents.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-1.5 text-xs sm:text-sm min-w-[44px]">
              <Wrench className="h-3.5 w-3.5" /> {t("nav.interventions") || "Maintenance"}
              {openInterventions.length > 0 && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{openInterventions.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="finances" className="flex items-center gap-1.5 text-xs sm:text-sm min-w-[44px]">
              <TrendingUp className="h-3.5 w-3.5" /> {t("page.property.finances") || "Finances"}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-1.5 text-xs sm:text-sm min-w-[44px]">
              <ClipboardList className="h-3.5 w-3.5" /> {t("page.property.inventory") || "Inventory"}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-1.5 text-xs sm:text-sm min-w-[44px]">
              <Activity className="h-3.5 w-3.5" /> {t("page.property.activity") || "Activity"}
            </TabsTrigger>
          </TabsList>

          {/* Tenants tab */}
          <TabsContent value="tenants" className="mt-4">
            {tenants.length === 0 ? (
              <EmptyState icon={Users} label={t("page.property.no_tenants") || "No tenants assigned"} action={t("page.property.add_tenant") || "Add tenant"} actionLink={`/dashboard/tenants?property=${propertyId}`} />
            ) : (
              <div className="space-y-3">
                {tenants.map(tenant => {
                  const active = !tenant.lease_end || tenant.lease_end >= today;
                  return (
                    <div key={tenant.id} className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{tenant.name}</p>
                          <Badge variant={active ? "default" : "secondary"} className="text-[10px]">
                            {active ? (t("page.property.active") || "Active") : (t("page.property.ended") || "Ended")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tenant.email} {tenant.phone ? `· ${tenant.phone}` : ""}
                        </p>
                        {tenant.lease_start && (
                          <p className="text-xs text-muted-foreground">
                            {t("page.property.lease") || "Lease"}: {tenant.lease_start} → {tenant.lease_end || "∞"}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">{fmt(tenant.rent_amount + (tenant.charges_amount || 0))}<span className="text-xs text-muted-foreground font-normal">/{t("page.property.month") || "mo"}</span></p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Payments tab */}
          <TabsContent value="payments" className="mt-4">
            {rentCalls.length === 0 ? (
              <EmptyState icon={Wallet} label={t("page.property.no_payments") || "No payment records"} />
            ) : (
              <div className="space-y-2">
                {rentCalls.slice(0, 12).map(rc => (
                  <div key={rc.id} className="bg-card rounded-lg border border-border px-4 py-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${rc.paid ? "bg-success" : "bg-destructive"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{rc.month}</p>
                      <p className="text-xs text-muted-foreground">{rc.paid ? (t("page.property.paid") || "Paid") : (t("page.property.pending") || "Pending")}</p>
                    </div>
                    <p className="text-sm font-bold text-foreground">{fmt(rc.total_amount || 0)}</p>
                  </div>
                ))}
                {rentCalls.length > 12 && (
                  <Link to={`/dashboard/reminders?property=${propertyId}`} className="text-xs text-accent hover:underline flex items-center gap-1 mt-2">
                    {t("page.property.view_all") || "View all"} <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )}
          </TabsContent>

          {/* Documents tab — filtered by property leases */}
          <TabsContent value="documents" className="mt-4">
            {documents.length === 0 ? (
              <EmptyState icon={FileText} label={t("page.property.no_documents") || "No documents for this property"} action={t("page.property.create_document") || "Create document"} actionLink="/dashboard/documents" />
            ) : (
              <div className="space-y-2">
                {documents.slice(0, 10).map(doc => (
                  <div key={doc.id} className="bg-card rounded-lg border border-border px-4 py-3 flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.doc_type} · {new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{doc.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Maintenance tab */}
          <TabsContent value="maintenance" className="mt-4">
            {interventions.length === 0 ? (
              <EmptyState icon={Wrench} label={t("page.property.no_interventions") || "No interventions"} action={t("page.property.create_intervention") || "Report issue"} actionLink={`/dashboard/interventions?property=${propertyId}`} />
            ) : (
              <div className="space-y-2">
                {interventions.map(intv => {
                  const statusColor = intv.status === "completed" ? "bg-success" : intv.status === "in_progress" ? "bg-accent" : "bg-muted-foreground";
                  return (
                    <div key={intv.id} className="bg-card rounded-lg border border-border px-4 py-3 flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{intv.title}</p>
                        <p className="text-xs text-muted-foreground">{intv.category} · {intv.priority}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{intv.status}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Finances tab */}
          <TabsContent value="finances" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">{t("page.property.total_revenue") || "Total Revenue"}</p>
                <p className="text-2xl font-bold text-success">{fmt(totalRevenue)}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">{t("page.property.total_expenses") || "Total Expenses"}</p>
                <p className="text-2xl font-bold text-destructive">{fmt(totalExpenses)}</p>
              </div>
            </div>
            {expenses.length === 0 ? (
              <EmptyState icon={Wallet} label={t("page.property.no_expenses") || "No expenses recorded"} action={t("page.property.add_expense") || "Add expense"} actionLink="/dashboard/expenses" />
            ) : (
              <div className="space-y-2">
                {expenses.map(exp => (
                  <div key={exp.id} className="bg-card rounded-lg border border-border px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{exp.label}</p>
                      <p className="text-xs text-muted-foreground">{exp.category} · {exp.expense_date}</p>
                    </div>
                    <p className="text-sm font-bold text-foreground">{fmt(exp.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Inventory tab */}
          <TabsContent value="inventory" className="mt-4">
            {inventories.length === 0 ? (
              <EmptyState icon={ClipboardList} label={t("page.property.no_inventory") || "No inventory reports"} action={t("page.property.create_inventory") || "Create inventory"} actionLink={`/dashboard/rental?tab=inventory&property=${propertyId}`} />
            ) : (
              <div className="space-y-2">
                {inventories.map(inv => (
                  <div key={inv.id} className="bg-card rounded-lg border border-border px-4 py-3 flex items-center gap-3">
                    <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {inv.report_type === "entry" ? (t("page.property.entry_report") || "Entry Report") : (t("page.property.exit_report") || "Exit Report")}
                      </p>
                      <p className="text-xs text-muted-foreground">{inv.report_date}</p>
                    </div>
                    <Badge variant={inv.status === "completed" ? "default" : "secondary"} className="text-[10px]">{inv.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── 3. Activity timeline tab ── */}
          <TabsContent value="activity" className="mt-4">
            {propertyId && orgId ? (
              <div className="bg-card rounded-xl border border-border p-4 min-h-[300px]">
                <EntityActivityLog entityType="property" entityId={propertyId} orgId={orgId} maxItems={30} />
              </div>
            ) : (
              <EmptyState icon={Activity} label="No activity" />
            )}
          </TabsContent>
        </Tabs>

        {/* Cross-module links */}
        {(seasonalListings.length > 0 || realEstateListings.length > 0) && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-4">
            {seasonalListings.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-accent" />
                  {t("page.property.seasonal_listings") || "Seasonal Listings"}
                </h3>
                <div className="space-y-2">
                  {seasonalListings.map(listing => (
                    <Link
                      key={listing.id}
                      to={`/listing/${listing.slug || listing.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{listing.title || property.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {listing.active ? "🟢 Live" : "⚪ Draft"} · {listing.price_per_night ? `${fmt(listing.price_per_night)}/night` : ""}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {realEstateListings.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-success" />
                  {t("page.property.sale_listings") || "Sale Listings"}
                </h3>
                <div className="space-y-2">
                  {realEstateListings.map((listing: any) => (
                    <Link
                      key={listing.id}
                      to={`/real-estate/${listing.slug || listing.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{listing.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {listing.status === "active" ? "🟢 Active" : "⚪ " + listing.status} · {listing.price ? `${fmt(listing.price)}` : ""}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

/* ── Sub-components ── */

const ModeChip = ({ active, icon: Icon, label }: { active: boolean; icon: React.ElementType; label: string }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
    active
      ? "bg-primary/10 border-primary/30 text-primary"
      : "bg-muted/50 border-border text-muted-foreground"
  }`}>
    <Icon className="h-3.5 w-3.5" />
    {label}
    {active && <span className="w-2 h-2 rounded-full bg-success" />}
  </div>
);

const EmptyState = ({ icon: Icon, label, action, actionLink }: { icon: any; label: string; action?: string; actionLink?: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <p className="text-sm text-muted-foreground mb-3">{label}</p>
    {action && actionLink && (
      <Link to={actionLink} className="text-xs text-accent font-semibold hover:underline">
        {action} →
      </Link>
    )}
  </div>
);

export default PropertyDetailHub;
