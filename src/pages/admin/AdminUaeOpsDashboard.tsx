/**
 * UAE Operations Dashboard — Admin control center for pre-launch quality management.
 * KPIs, filters, audit quality, source hygiene, geo breakdown, bulk actions.
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { auditShop, type ShopAuditResult } from "@/lib/audit/shop-audit";
import { runCleaningPipeline, type CleaningResult } from "@/lib/cleaning/data-cleaning-pipeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Loader2, RefreshCw, Download, AlertTriangle, CheckCircle2, MapPin, Store, Shield, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";

// ── Types ──
interface ShopRow {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  region: string;
  vertical: string;
  cluster: string;
  subcategory: string;
  source_type: string;
  source_confidence: number;
  audit_score: number;
  readiness_status: string;
  activation_status: string;
  launch_status: string;
  is_claimed: boolean;
  has_menu: boolean;
  has_photo: boolean;
  products_count: number;
  cover_url: string;
  cover_auto_url: string;
  cover_owner_url: string;
  banner_url: string;
  logo_url: string;
  contact_phone: string;
  phone: string;
  rating: number;
  review_count: number;
  created_at: string;
  cover_source: string;
  [key: string]: any;
}

interface Filters {
  country: string;
  region: string;
  city: string;
  vertical: string;
  sourceType: string;
  readiness: string;
  claimed: string;
  hasPhoto: string;
  hasMenu: string;
  hasRating: string;
}

const DEFAULT_FILTERS: Filters = {
  country: "all", region: "all", city: "all", vertical: "all",
  sourceType: "all", readiness: "all", claimed: "all",
  hasPhoto: "all", hasMenu: "all", hasRating: "all",
};

// ── Helpers ──
function getBlockers(shop: any): string[] {
  const audit = auditShop(shop);
  return audit.blockers;
}

function hasDuplicateCover(shop: any, coverMap: Map<string, number>): boolean {
  const cover = shop.cover_owner_url || shop.cover_auto_url || shop.cover_url || shop.banner_url;
  if (!cover) return false;
  return (coverMap.get(cover) || 0) > 1;
}

export default function AdminUaeOpsDashboard() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [cleaning, setCleaning] = useState(false);
  const [cleaningProgress, setCleaningProgress] = useState("");
  const [cleaningResult, setCleaningResult] = useState<CleaningResult | null>(null);
  const [bulkRunning, setBulkRunning] = useState<string | null>(null);

  const fetchShops = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("storefront_pages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (!error && data) setShops(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchShops(); }, [fetchShops]);

  // ── Cover usage map ──
  const coverMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of shops) {
      const c = s.cover_owner_url || s.cover_auto_url || s.cover_url || s.banner_url;
      if (c) m.set(c, (m.get(c) || 0) + 1);
    }
    return m;
  }, [shops]);

  // ── Filtered shops ──
  const filtered = useMemo(() => {
    return shops.filter(s => {
      if (filters.country !== "all" && s.country !== filters.country) return false;
      if (filters.region !== "all" && s.region !== filters.region) return false;
      if (filters.city !== "all" && s.city !== filters.city) return false;
      if (filters.vertical !== "all" && s.vertical !== filters.vertical) return false;
      if (filters.sourceType !== "all" && s.source_type !== filters.sourceType) return false;
      if (filters.readiness !== "all" && s.readiness_status !== filters.readiness) return false;
      if (filters.claimed === "yes" && !s.is_claimed) return false;
      if (filters.claimed === "no" && s.is_claimed) return false;
      if (filters.hasPhoto === "yes" && !s.has_photo && !s.cover_url && !s.cover_auto_url && !s.cover_owner_url) return false;
      if (filters.hasPhoto === "no" && (s.has_photo || s.cover_url || s.cover_auto_url || s.cover_owner_url)) return false;
      if (filters.hasMenu === "yes" && !s.has_menu && (s.products_count ?? 0) === 0) return false;
      if (filters.hasMenu === "no" && (s.has_menu || (s.products_count ?? 0) > 0)) return false;
      if (filters.hasRating === "yes" && !s.rating) return false;
      if (filters.hasRating === "no" && s.rating) return false;
      return true;
    });
  }, [shops, filters]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const total = filtered.length;
    const draft = filtered.filter(s => s.readiness_status === "draft").length;
    const needsReview = filtered.filter(s => s.readiness_status === "needs_review").length;
    const ready = filtered.filter(s => s.readiness_status === "ready").length;
    const live = filtered.filter(s => s.readiness_status === "live" || s.launch_status === "live").length;
    const blocked = filtered.filter(s => getBlockers(s).length > 0).length;
    const claimed = filtered.filter(s => s.is_claimed).length;
    const unclaimed = total - claimed;
    const avgScore = total > 0 ? Math.round(filtered.reduce((a, s) => a + (s.audit_score ?? 0), 0) / total) : 0;
    const publishable = filtered.filter(s => {
      const a = auditShop(s);
      return a.isPublishable;
    }).length;
    return { total, draft, needsReview, ready, live, blocked, claimed, unclaimed, avgScore, publishable };
  }, [filtered]);

  // ── Audit quality ──
  const auditQuality = useMemo(() => {
    const noCover = filtered.filter(s => !s.cover_owner_url && !s.cover_auto_url && !s.cover_url && !s.banner_url).length;
    const dupCover = filtered.filter(s => hasDuplicateCover(s, coverMap)).length;
    const invalidTax = filtered.filter(s => !s.vertical).length;
    const noContact = filtered.filter(s => !s.contact_phone && !s.phone).length;
    const foodNoMenu = filtered.filter(s => s.vertical === "food" && !s.has_menu && (s.products_count ?? 0) === 0).length;
    const noRating = filtered.filter(s => !s.rating).length;
    const withBlockers = filtered.filter(s => getBlockers(s).length > 0).length;
    return { noCover, dupCover, invalidTax, noContact, foodNoMenu, noRating, withBlockers };
  }, [filtered, coverMap]);

  // ── Source hygiene ──
  const sourceStats = useMemo(() => {
    const byType: Record<string, number> = {};
    let totalConf = 0;
    let confCount = 0;
    const claimedBySource: Record<string, { claimed: number; unclaimed: number }> = {};
    for (const s of filtered) {
      const src = s.source_type || "unknown";
      byType[src] = (byType[src] || 0) + 1;
      if (s.source_confidence != null) { totalConf += s.source_confidence; confCount++; }
      if (!claimedBySource[src]) claimedBySource[src] = { claimed: 0, unclaimed: 0 };
      if (s.is_claimed) claimedBySource[src].claimed++; else claimedBySource[src].unclaimed++;
    }
    const avgConf = confCount > 0 ? Math.round(totalConf / confCount) : 0;
    const today = new Date().toISOString().slice(0, 10);
    const importedToday = filtered.filter(s => s.created_at?.startsWith(today)).length;
    return { byType, avgConf, claimedBySource, importedToday };
  }, [filtered]);

  // ── UAE geo ──
  const geoStats = useMemo(() => {
    const byRegion: Record<string, number> = {};
    const byCity: Record<string, number> = {};
    for (const s of filtered) {
      const r = s.region || "Unknown";
      const c = s.city || "Unknown";
      byRegion[r] = (byRegion[r] || 0) + 1;
      byCity[c] = (byCity[c] || 0) + 1;
    }
    return { byRegion, byCity };
  }, [filtered]);

  // ── Top blockers ──
  const topBlockers = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of filtered) {
      const blockers = getBlockers(s);
      for (const b of blockers) {
        counts[b] = (counts[b] || 0) + 1;
      }
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 10);
  }, [filtered]);

  // ── Unique filter values ──
  const uniqueVals = useMemo(() => ({
    countries: [...new Set(shops.map(s => s.country).filter(Boolean))],
    regions: [...new Set(shops.map(s => s.region).filter(Boolean))],
    cities: [...new Set(shops.map(s => s.city).filter(Boolean))],
    verticals: [...new Set(shops.map(s => s.vertical).filter(Boolean))],
    sourceTypes: [...new Set(shops.map(s => s.source_type).filter(Boolean))],
  }), [shops]);

  // ── Bulk actions ──
  const handleRunCleaning = async () => {
    setCleaning(true);
    setCleaningResult(null);
    try {
      const result = await runCleaningPipeline((step, done, total) => {
        setCleaningProgress(`${step} (${done}/${total})`);
      });
      setCleaningResult(result);
      toast.success(`Cleaning complete: ${result.totalProcessed} shops processed`);
      await fetchShops();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCleaning(false);
      setCleaningProgress("");
    }
  };

  const handleExportCsv = () => {
    const headers = ["name", "source_type", "region", "city", "vertical", "subcategory", "audit_score", "readiness_status", "is_claimed", "has_menu", "has_photo", "products_count"];
    const rows = filtered.map(s => headers.map(h => String(s[h] ?? "")));
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uae-ops-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handleBulkAudit = async () => {
    setBulkRunning("audit");
    let count = 0;
    for (const shop of filtered) {
      const audit = auditShop(shop);
      await (supabase as any).from("storefront_pages").update({
        audit_score: audit.score,
        readiness_status: audit.status,
      }).eq("id", shop.id);
      count++;
    }
    toast.success(`Audit recalculated for ${count} shops`);
    setBulkRunning(null);
    fetchShops();
  };

  const setFilter = (key: keyof Filters, value: string) =>
    setFilters(f => ({ ...f, [key]: value }));

  const FilterSelect = ({ label, filterKey, options }: { label: string; filterKey: keyof Filters; options: string[] }) => (
    <Select value={filters[filterKey]} onValueChange={v => setFilter(filterKey, v)}>
      <SelectTrigger className="h-8 text-xs w-[130px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label}</SelectItem>
        {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobilePageHeader title="UAE Operations" subtitle={`${shops.length} shops loaded`} backTo="/admin/super-dashboard" />

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">

        {/* ── 1. KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: "Total", value: kpis.total, color: "text-foreground" },
            { label: "Draft", value: kpis.draft, color: "text-muted-foreground" },
            { label: "Needs Review", value: kpis.needsReview, color: "text-yellow-500" },
            { label: "Ready", value: kpis.ready, color: "text-blue-500" },
            { label: "Live", value: kpis.live, color: "text-green-500" },
            { label: "Publishable", value: kpis.publishable, color: "text-emerald-500" },
            { label: "Blocked", value: kpis.blocked, color: "text-destructive" },
            { label: "Claimed", value: kpis.claimed, color: "text-primary" },
            { label: "Unclaimed", value: kpis.unclaimed, color: "text-muted-foreground" },
            { label: "Avg Score", value: kpis.avgScore, color: "text-foreground" },
          ].map(k => (
            <Card key={k.label} className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </Card>
          ))}
        </div>

        {/* ── 2. Filters ── */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pb-4">
            <FilterSelect label="Country" filterKey="country" options={uniqueVals.countries} />
            <FilterSelect label="Region" filterKey="region" options={uniqueVals.regions} />
            <FilterSelect label="City" filterKey="city" options={uniqueVals.cities} />
            <FilterSelect label="Vertical" filterKey="vertical" options={uniqueVals.verticals} />
            <FilterSelect label="Source" filterKey="sourceType" options={uniqueVals.sourceTypes} />
            <FilterSelect label="Readiness" filterKey="readiness" options={["draft", "needs_review", "ready", "live"]} />
            <FilterSelect label="Claimed" filterKey="claimed" options={["yes", "no"]} />
            <FilterSelect label="Photos" filterKey="hasPhoto" options={["yes", "no"]} />
            <FilterSelect label="Menu" filterKey="hasMenu" options={["yes", "no"]} />
            <FilterSelect label="Rating" filterKey="hasRating" options={["yes", "no"]} />
            <Button variant="ghost" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)} className="text-xs">
              Reset
            </Button>
          </CardContent>
        </Card>

        {/* ── 3. Audit Quality ── */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Audit Quality</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Missing cover", value: auditQuality.noCover, bad: true },
              { label: "Duplicate covers", value: auditQuality.dupCover, bad: true },
              { label: "Invalid taxonomy", value: auditQuality.invalidTax, bad: true },
              { label: "No contact", value: auditQuality.noContact, bad: true },
              { label: "Food without menu", value: auditQuality.foodNoMenu, bad: true },
              { label: "No rating", value: auditQuality.noRating, bad: false },
              { label: "With blockers", value: auditQuality.withBlockers, bad: true },
            ].map(q => (
              <div key={q.label} className="flex items-center justify-between p-2 rounded bg-muted/50">
                <span className="text-xs text-muted-foreground">{q.label}</span>
                <Badge variant={q.bad && q.value > 0 ? "destructive" : "secondary"} className="text-[10px]">{q.value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── 4. Source Hygiene ── */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2"><Store className="h-4 w-4" /> Source Hygiene</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {Object.entries(sourceStats.byType).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-xs gap-1">
                  {type}: {count}
                </Badge>
              ))}
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Avg confidence: <strong className="text-foreground">{sourceStats.avgConf}%</strong></span>
              <span>Imported today: <strong className="text-foreground">{sourceStats.importedToday}</strong></span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(sourceStats.claimedBySource).map(([src, v]) => (
                <div key={src} className="text-[10px] bg-muted p-1.5 rounded">
                  <span className="font-medium">{src}</span>: {v.claimed} claimed / {v.unclaimed} unclaimed
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── 5. UAE Geo ── */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> UAE Geography</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1 uppercase">By Emirate / Region</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(geoStats.byRegion).sort(([, a], [, b]) => b - a).map(([region, count]) => (
                  <Badge key={region} variant="outline" className="text-xs">{region}: {count}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1 uppercase">Top Cities</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(geoStats.byCity).sort(([, a], [, b]) => b - a).slice(0, 15).map(([city, count]) => (
                  <Badge key={city} variant="secondary" className="text-[10px]">{city}: {count}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 8. Top Blockers ── */}
        {topBlockers.length > 0 && (
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Top Blockers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {topBlockers.map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between text-xs p-1.5 rounded bg-destructive/5">
                  <span className="text-muted-foreground">{reason}</span>
                  <Badge variant="destructive" className="text-[10px]">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── 7. Bulk Actions ── */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Bulk Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleBulkAudit} disabled={!!bulkRunning} className="text-xs gap-1">
              {bulkRunning === "audit" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Recalculate Audit ({filtered.length})
            </Button>
            <Button size="sm" variant="outline" onClick={handleRunCleaning} disabled={cleaning} className="text-xs gap-1">
              {cleaning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              {cleaning ? cleaningProgress : "Run Full Cleaning Pipeline"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportCsv} className="text-xs gap-1">
              <Download className="h-3 w-3" /> Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={fetchShops} className="text-xs gap-1">
              <RefreshCw className="h-3 w-3" /> Refresh Data
            </Button>
          </CardContent>
          {cleaningResult && (
            <CardContent className="pt-0">
              <div className="p-3 bg-muted rounded text-xs space-y-1">
                <p className="font-medium text-foreground">Cleaning Results:</p>
                <p>Processed: {cleaningResult.totalProcessed} | Duplicates hidden: {cleaningResult.duplicatesHidden}</p>
                <p>Taxonomy fixed: {cleaningResult.taxonomyFixed} | Covers fixed: {cleaningResult.coversFixed}</p>
                <p>Source fixed: {cleaningResult.sourceFixed} | Audit recalculated: {cleaningResult.auditRecalculated}</p>
                {cleaningResult.errors.length > 0 && (
                  <p className="text-destructive">Errors: {cleaningResult.errors.length}</p>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* ── 6. Detailed Table ── */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Shops ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Name", "Source", "Region", "City", "Vertical", "Sub", "Score", "Status", "Claimed", "Menu", "Photo", "Dup Cover", "Blockers"].map(h => (
                    <th key={h} className="text-left px-2 py-2 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map(s => {
                  const blockers = getBlockers(s);
                  const isDup = hasDuplicateCover(s, coverMap);
                  return (
                    <tr key={s.id} className="border-b hover:bg-muted/20">
                      <td className="px-2 py-1.5 font-medium max-w-[160px] truncate">{s.name || "—"}</td>
                      <td className="px-2 py-1.5">
                        <Badge variant="secondary" className="text-[9px]">{s.source_type || "—"}</Badge>
                      </td>
                      <td className="px-2 py-1.5 text-muted-foreground">{s.region || "—"}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{s.city || "—"}</td>
                      <td className="px-2 py-1.5">{s.vertical || "—"}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{s.subcategory || "—"}</td>
                      <td className="px-2 py-1.5 font-mono">{s.audit_score ?? "—"}</td>
                      <td className="px-2 py-1.5">
                        <Badge variant={s.readiness_status === "ready" ? "default" : s.readiness_status === "live" ? "default" : "secondary"} className="text-[9px]">
                          {s.readiness_status || "—"}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5">{s.is_claimed ? <CheckCircle2 className="h-3 w-3 text-primary" /> : "—"}</td>
                      <td className="px-2 py-1.5">{s.has_menu || (s.products_count ?? 0) > 0 ? "✓" : "—"}</td>
                      <td className="px-2 py-1.5">{s.cover_url || s.cover_auto_url || s.cover_owner_url ? "✓" : "—"}</td>
                      <td className="px-2 py-1.5">{isDup ? <AlertTriangle className="h-3 w-3 text-accent-foreground" /> : "—"}</td>
                      <td className="px-2 py-1.5">
                        {blockers.length > 0 ? (
                          <Badge variant="destructive" className="text-[9px]">{blockers.length}</Badge>
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <p className="text-center text-[10px] text-muted-foreground py-2">
                Showing 100 of {filtered.length} shops. Export CSV for full data.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
