/**
 * UAE Operations Dashboard — Full admin control center.
 * KPIs, filters, audit quality, source hygiene, geo, display quality,
 * routing integrity, visibility modes, ranking, bulk actions, top blockers.
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { auditShop } from "@/lib/audit/shop-audit";
import { runCleaningPipeline, type CleaningResult } from "@/lib/cleaning/data-cleaning-pipeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, RefreshCw, Download, AlertTriangle, CheckCircle2,
  MapPin, Store, Shield, Wrench, Eye, Router, BarChart3, Layers
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──
interface ShopRow {
  id: string; name: string; slug: string; city: string; country: string;
  region: string; vertical: string; cluster: string; subcategory: string;
  source_type: string; source_confidence: number; audit_score: number;
  readiness_status: string; activation_status: string; launch_status: string;
  visibility_mode: string; route_status: string; display_priority: number;
  blocking_reason: string;
  is_claimed: boolean; has_menu: boolean; has_photo: boolean;
  products_count: number; cover_url: string; cover_auto_url: string;
  cover_owner_url: string; banner_url: string; logo_url: string;
  contact_phone: string; phone: string; rating: number; review_count: number;
  created_at: string; cover_source: string; address: string;
  is_auto_generated: boolean; latitude: number; longitude: number;
  [key: string]: any;
}

interface Filters {
  country: string; region: string; city: string; vertical: string;
  sourceType: string; readiness: string; visibility: string;
  claimed: string; hasPhoto: string; hasMenu: string; hasRating: string;
  dupImage: string; taxMismatch: string; brokenRoute: string;
}

const DEFAULT_FILTERS: Filters = {
  country: "all", region: "all", city: "all", vertical: "all",
  sourceType: "all", readiness: "all", visibility: "all", claimed: "all",
  hasPhoto: "all", hasMenu: "all", hasRating: "all",
  dupImage: "all", taxMismatch: "all", brokenRoute: "all",
};

// ── Helpers ──
function getBlockers(shop: any): string[] { return auditShop(shop).blockers; }

function hasCover(s: any): boolean {
  return !!(s.cover_owner_url || s.cover_auto_url || s.cover_url || s.banner_url);
}

function hasDupCover(s: any, coverMap: Map<string, number>): boolean {
  const c = s.cover_owner_url || s.cover_auto_url || s.cover_url || s.banner_url;
  return c ? (coverMap.get(c) || 0) > 1 : false;
}

function hasTaxMismatch(s: any): boolean {
  return !s.vertical || (!s.subcategory && !s.cluster);
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
      .from("storefront_pages").select("*")
      .order("created_at", { ascending: false }).limit(1000);
    if (!error && data) setShops(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchShops(); }, [fetchShops]);

  // Cover map
  const coverMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of shops) {
      const c = s.cover_owner_url || s.cover_auto_url || s.cover_url || s.banner_url;
      if (c) m.set(c, (m.get(c) || 0) + 1);
    }
    return m;
  }, [shops]);

  // Filtered shops
  const filtered = useMemo(() => {
    return shops.filter(s => {
      if (filters.country !== "all" && s.country !== filters.country) return false;
      if (filters.region !== "all" && s.region !== filters.region) return false;
      if (filters.city !== "all" && s.city !== filters.city) return false;
      if (filters.vertical !== "all" && s.vertical !== filters.vertical) return false;
      if (filters.sourceType !== "all" && s.source_type !== filters.sourceType) return false;
      if (filters.readiness !== "all" && s.readiness_status !== filters.readiness) return false;
      if (filters.visibility !== "all" && s.visibility_mode !== filters.visibility) return false;
      if (filters.claimed === "yes" && !s.is_claimed) return false;
      if (filters.claimed === "no" && s.is_claimed) return false;
      if (filters.hasPhoto === "yes" && !hasCover(s)) return false;
      if (filters.hasPhoto === "no" && hasCover(s)) return false;
      if (filters.hasMenu === "yes" && !s.has_menu && (s.products_count ?? 0) === 0) return false;
      if (filters.hasMenu === "no" && (s.has_menu || (s.products_count ?? 0) > 0)) return false;
      if (filters.hasRating === "yes" && !s.rating) return false;
      if (filters.hasRating === "no" && s.rating) return false;
      if (filters.dupImage === "yes" && !hasDupCover(s, coverMap)) return false;
      if (filters.dupImage === "no" && hasDupCover(s, coverMap)) return false;
      if (filters.taxMismatch === "yes" && !hasTaxMismatch(s)) return false;
      if (filters.taxMismatch === "no" && hasTaxMismatch(s)) return false;
      if (filters.brokenRoute === "yes" && s.route_status !== "broken") return false;
      if (filters.brokenRoute === "no" && s.route_status === "broken") return false;
      return true;
    });
  }, [shops, filters, coverMap]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const f = filtered;
    const total = f.length;
    return {
      total,
      draft: f.filter(s => s.readiness_status === "draft").length,
      needsReview: f.filter(s => s.readiness_status === "needs_review").length,
      ready: f.filter(s => s.readiness_status === "ready").length,
      live: f.filter(s => s.readiness_status === "live" || s.launch_status === "live").length,
      comingSoon: f.filter(s => s.visibility_mode === "coming_soon").length,
      searchOnly: f.filter(s => s.visibility_mode === "search_only").length,
      mapOnly: f.filter(s => s.visibility_mode === "map_only").length,
      hidden: f.filter(s => s.visibility_mode === "hidden" || s.launch_status === "hidden").length,
      publishable: f.filter(s => auditShop(s).isPublishable).length,
      blocked: f.filter(s => getBlockers(s).length > 0).length,
      claimed: f.filter(s => s.is_claimed).length,
      unclaimed: f.filter(s => !s.is_claimed).length,
      avgScore: total > 0 ? Math.round(f.reduce((a, s) => a + (s.audit_score ?? 0), 0) / total) : 0,
    };
  }, [filtered]);

  // ── Audit quality ──
  const auditQ = useMemo(() => ({
    noCover: filtered.filter(s => !hasCover(s)).length,
    dupCover: filtered.filter(s => hasDupCover(s, coverMap)).length,
    invalidTax: filtered.filter(s => hasTaxMismatch(s)).length,
    noContact: filtered.filter(s => !s.contact_phone && !s.phone).length,
    foodNoMenu: filtered.filter(s => s.vertical === "food" && !s.has_menu && (s.products_count ?? 0) === 0).length,
    noRating: filtered.filter(s => !s.rating).length,
    withBlockers: filtered.filter(s => getBlockers(s).length > 0).length,
    weakScore: filtered.filter(s => (s.audit_score ?? 0) < 50).length,
  }), [filtered, coverMap]);

  // ── Source hygiene ──
  const sourceStats = useMemo(() => {
    const byType: Record<string, number> = {};
    let totalConf = 0, confCount = 0;
    const claimedBySource: Record<string, { claimed: number; unclaimed: number }> = {};
    let autoGen = 0, ownerVerified = 0;
    for (const s of filtered) {
      const src = s.source_type || "unknown";
      byType[src] = (byType[src] || 0) + 1;
      if (s.source_confidence != null) { totalConf += s.source_confidence; confCount++; }
      if (!claimedBySource[src]) claimedBySource[src] = { claimed: 0, unclaimed: 0 };
      if (s.is_claimed) claimedBySource[src].claimed++; else claimedBySource[src].unclaimed++;
      if (s.is_auto_generated) autoGen++; else if (s.is_claimed) ownerVerified++;
    }
    const today = new Date().toISOString().slice(0, 10);
    return {
      byType, avgConf: confCount > 0 ? Math.round(totalConf / confCount) : 0,
      claimedBySource, importedToday: filtered.filter(s => s.created_at?.startsWith(today)).length,
      autoGen, ownerVerified,
    };
  }, [filtered]);

  // ── Geo ──
  const geoStats = useMemo(() => {
    const byRegion: Record<string, number> = {};
    const byCity: Record<string, number> = {};
    for (const s of filtered) {
      byRegion[s.region || "Unknown"] = (byRegion[s.region || "Unknown"] || 0) + 1;
      byCity[s.city || "Unknown"] = (byCity[s.city || "Unknown"] || 0) + 1;
    }
    const emptyZones = Object.entries(byCity).filter(([, c]) => c <= 1).map(([z]) => z);
    const dirtyZones = Object.entries(byCity)
      .filter(([, c]) => c > 20)
      .map(([z, c]) => ({ zone: z, count: c }));
    return { byRegion, byCity, emptyZones, dirtyZones };
  }, [filtered]);

  // ── Display quality ──
  const displayQ = useMemo(() => ({
    noCoverCards: filtered.filter(s => !hasCover(s)).length,
    dupCoverCards: filtered.filter(s => hasDupCover(s, coverMap)).length,
    emptyAddress: filtered.filter(s => !s.address && !s.region).length,
    missingCategory: filtered.filter(s => !s.subcategory && !s.cluster).length,
    missingRatingBadge: filtered.filter(s => !s.rating && s.visibility_mode !== "hidden").length,
    incompleteMapPins: filtered.filter(s => (!s.latitude && !s.longitude) && s.visibility_mode !== "hidden").length,
  }), [filtered, coverMap]);

  // ── Routing integrity ──
  const routingStats = useMemo(() => ({
    brokenRoutes: filtered.filter(s => s.route_status === "broken" || (!s.slug && !s.id)).length,
    warningRoutes: filtered.filter(s => s.route_status === "warning").length,
    validRoutes: filtered.filter(s => s.route_status === "valid" || (!s.route_status && s.slug)).length,
    noSlug: filtered.filter(s => !s.slug).length,
  }), [filtered]);

  // ── Visibility breakdown ──
  const visModes = useMemo(() => {
    const modes: Record<string, number> = { hidden: 0, map_only: 0, search_only: 0, coming_soon: 0, ready: 0, live: 0 };
    for (const s of filtered) {
      const m = s.visibility_mode || "coming_soon";
      modes[m] = (modes[m] || 0) + 1;
    }
    return modes;
  }, [filtered]);

  // ── Top blockers ──
  const topBlockers = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of filtered) {
      for (const b of getBlockers(s)) counts[b] = (counts[b] || 0) + 1;
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 12);
  }, [filtered]);

  // ── Unique filter values ──
  const uv = useMemo(() => ({
    countries: [...new Set(shops.map(s => s.country).filter(Boolean))],
    regions: [...new Set(shops.map(s => s.region).filter(Boolean))],
    cities: [...new Set(shops.map(s => s.city).filter(Boolean))],
    verticals: [...new Set(shops.map(s => s.vertical).filter(Boolean))],
    sourceTypes: [...new Set(shops.map(s => s.source_type).filter(Boolean))],
  }), [shops]);

  // ── Bulk actions ──
  const handleRunCleaning = async () => {
    setCleaning(true); setCleaningResult(null);
    try {
      const res = await runCleaningPipeline((step, done, total) => setCleaningProgress(`${step} (${done}/${total})`));
      setCleaningResult(res);
      toast.success(`Cleaning complete: ${res.totalProcessed} shops processed`);
      await fetchShops();
    } catch (e: any) { toast.error(e.message); }
    finally { setCleaning(false); setCleaningProgress(""); }
  };

  const handleBulkAudit = async () => {
    setBulkRunning("audit");
    let count = 0;
    for (const shop of filtered) {
      const audit = auditShop(shop);
      await (supabase as any).from("storefront_pages").update({
        audit_score: audit.score, readiness_status: audit.status,
      }).eq("id", shop.id);
      count++;
    }
    toast.success(`Audit recalculated for ${count} shops`);
    setBulkRunning(null); fetchShops();
  };

  const handleHideBlocked = async () => {
    setBulkRunning("hide");
    let count = 0;
    for (const shop of filtered) {
      if (getBlockers(shop).length > 0 && shop.visibility_mode !== "hidden") {
        await (supabase as any).from("storefront_pages").update({
          visibility_mode: "hidden", blocking_reason: getBlockers(shop).slice(0, 3).join("; ")
        }).eq("id", shop.id);
        count++;
      }
    }
    toast.success(`${count} blocked shops hidden`);
    setBulkRunning(null); fetchShops();
  };

  const handleExportCsv = () => {
    const headers = ["name", "source_type", "region", "city", "vertical", "subcategory", "audit_score",
      "readiness_status", "visibility_mode", "is_claimed", "has_menu", "has_photo", "products_count",
      "route_status", "display_priority", "blocking_reason"];
    const rows = filtered.map(s => headers.map(h => String(s[h] ?? "")));
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `uae-ops-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const setF = (key: keyof Filters, value: string) => setFilters(f => ({ ...f, [key]: value }));

  const FS = ({ label, fk, options }: { label: string; fk: keyof Filters; options: string[] }) => (
    <Select value={filters[fk]} onValueChange={v => setF(fk, v)}>
      <SelectTrigger className="h-7 text-[10px] w-[110px]"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label}</SelectItem>
        {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const KpiCard = ({ label, value, color = "text-foreground" }: { label: string; value: number; color?: string }) => (
    <Card className="p-2">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-tight">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </Card>
  );

  const QRow = ({ label, value, bad = true }: { label: string; value: number; bad?: boolean }) => (
    <div className="flex items-center justify-between p-1.5 rounded bg-muted/50">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <Badge variant={bad && value > 0 ? "destructive" : "secondary"} className="text-[9px] h-5">{value}</Badge>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobilePageHeader title="UAE Operations" subtitle={`${shops.length} shops`} backTo="/admin/super-dashboard" />

      <div className="max-w-7xl mx-auto px-3 py-3 space-y-4">

        {/* ── 1. KPI Cards ── */}
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
          <KpiCard label="Total" value={kpis.total} />
          <KpiCard label="Draft" value={kpis.draft} color="text-muted-foreground" />
          <KpiCard label="Review" value={kpis.needsReview} color="text-yellow-500" />
          <KpiCard label="Ready" value={kpis.ready} color="text-blue-500" />
          <KpiCard label="Live" value={kpis.live} color="text-green-500" />
          <KpiCard label="Coming Soon" value={kpis.comingSoon} color="text-orange-400" />
          <KpiCard label="Search Only" value={kpis.searchOnly} color="text-sky-400" />
          <KpiCard label="Map Only" value={kpis.mapOnly} color="text-cyan-500" />
          <KpiCard label="Hidden" value={kpis.hidden} color="text-muted-foreground" />
          <KpiCard label="Publishable" value={kpis.publishable} color="text-emerald-500" />
          <KpiCard label="Blocked" value={kpis.blocked} color="text-destructive" />
          <KpiCard label="Claimed" value={kpis.claimed} color="text-primary" />
          <KpiCard label="Unclaimed" value={kpis.unclaimed} color="text-muted-foreground" />
          <KpiCard label="Avg Score" value={kpis.avgScore} />
        </div>

        {/* ── 2. Filters ── */}
        <Card>
          <CardHeader className="py-2 px-3"><CardTitle className="text-xs">Filters</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1.5 pb-3">
            <FS label="Country" fk="country" options={uv.countries} />
            <FS label="Region" fk="region" options={uv.regions} />
            <FS label="City" fk="city" options={uv.cities} />
            <FS label="Vertical" fk="vertical" options={uv.verticals} />
            <FS label="Source" fk="sourceType" options={uv.sourceTypes} />
            <FS label="Readiness" fk="readiness" options={["draft", "needs_review", "ready", "live"]} />
            <FS label="Visibility" fk="visibility" options={["hidden", "map_only", "search_only", "coming_soon", "ready", "live"]} />
            <FS label="Claimed" fk="claimed" options={["yes", "no"]} />
            <FS label="Photos" fk="hasPhoto" options={["yes", "no"]} />
            <FS label="Menu" fk="hasMenu" options={["yes", "no"]} />
            <FS label="Rating" fk="hasRating" options={["yes", "no"]} />
            <FS label="Dup Image" fk="dupImage" options={["yes", "no"]} />
            <FS label="Tax Error" fk="taxMismatch" options={["yes", "no"]} />
            <FS label="Broken Route" fk="brokenRoute" options={["yes", "no"]} />
            <Button variant="ghost" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)} className="text-[10px] h-7">Reset</Button>
          </CardContent>
        </Card>

        {/* ── Tabs for sections ── */}
        <Tabs defaultValue="audit" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-8">
            <TabsTrigger value="audit" className="text-[10px] gap-1"><Shield className="h-3 w-3" />Audit</TabsTrigger>
            <TabsTrigger value="display" className="text-[10px] gap-1"><Eye className="h-3 w-3" />Display</TabsTrigger>
            <TabsTrigger value="routing" className="text-[10px] gap-1"><Router className="h-3 w-3" />Routing</TabsTrigger>
            <TabsTrigger value="source" className="text-[10px] gap-1"><Store className="h-3 w-3" />Source</TabsTrigger>
          </TabsList>

          {/* ── 3. Audit Quality ── */}
          <TabsContent value="audit">
            <Card>
              <CardHeader className="py-2 px-3"><CardTitle className="text-xs">Audit Quality</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <QRow label="Missing cover" value={auditQ.noCover} />
                <QRow label="Duplicate covers" value={auditQ.dupCover} />
                <QRow label="Invalid taxonomy" value={auditQ.invalidTax} />
                <QRow label="No contact" value={auditQ.noContact} />
                <QRow label="Food w/o menu" value={auditQ.foodNoMenu} />
                <QRow label="No rating" value={auditQ.noRating} bad={false} />
                <QRow label="With blockers" value={auditQ.withBlockers} />
                <QRow label="Score < 50" value={auditQ.weakScore} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── 6. Display Quality ── */}
          <TabsContent value="display">
            <Card>
              <CardHeader className="py-2 px-3"><CardTitle className="text-xs">Display Quality Control</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <QRow label="Cards w/o cover" value={displayQ.noCoverCards} />
                <QRow label="Duplicate covers" value={displayQ.dupCoverCards} />
                <QRow label="Empty address" value={displayQ.emptyAddress} />
                <QRow label="Missing category" value={displayQ.missingCategory} />
                <QRow label="No rating badge" value={displayQ.missingRatingBadge} bad={false} />
                <QRow label="No map coords" value={displayQ.incompleteMapPins} />
              </CardContent>
            </Card>

            {/* Visibility Modes */}
            <Card className="mt-3">
              <CardHeader className="py-2 px-3"><CardTitle className="text-xs flex items-center gap-1"><Layers className="h-3 w-3" />Visibility Modes</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(visModes).map(([mode, count]) => (
                  <div key={mode} className="flex items-center gap-1.5 p-2 rounded bg-muted/50 min-w-[100px]">
                    <div className={`w-2 h-2 rounded-full ${
                      mode === "live" ? "bg-green-500" :
                      mode === "ready" ? "bg-blue-500" :
                      mode === "coming_soon" ? "bg-orange-400" :
                      mode === "search_only" ? "bg-sky-400" :
                      mode === "map_only" ? "bg-cyan-500" : "bg-muted-foreground"
                    }`} />
                    <span className="text-[10px] text-muted-foreground">{mode.replace("_", " ")}</span>
                    <span className="text-xs font-bold ml-auto">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── 7. Routing Integrity ── */}
          <TabsContent value="routing">
            <Card>
              <CardHeader className="py-2 px-3"><CardTitle className="text-xs">Routing Integrity</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <QRow label="Valid routes" value={routingStats.validRoutes} bad={false} />
                <QRow label="Broken routes" value={routingStats.brokenRoutes} />
                <QRow label="Warning routes" value={routingStats.warningRoutes} />
                <QRow label="Missing slug" value={routingStats.noSlug} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── 4. Source Hygiene ── */}
          <TabsContent value="source">
            <Card>
              <CardHeader className="py-2 px-3"><CardTitle className="text-xs">Source Hygiene</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(sourceStats.byType).map(([type, count]) => (
                    <Badge key={type} variant="outline" className="text-[10px] gap-1">{type}: {count}</Badge>
                  ))}
                </div>
                <div className="flex gap-4 text-[10px] text-muted-foreground flex-wrap">
                  <span>Avg confidence: <strong className="text-foreground">{sourceStats.avgConf}%</strong></span>
                  <span>Imported today: <strong className="text-foreground">{sourceStats.importedToday}</strong></span>
                  <span>Auto-generated: <strong className="text-foreground">{sourceStats.autoGen}</strong></span>
                  <span>Owner-verified: <strong className="text-foreground">{sourceStats.ownerVerified}</strong></span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(sourceStats.claimedBySource).map(([src, v]) => (
                    <div key={src} className="text-[9px] bg-muted p-1.5 rounded">
                      <span className="font-medium">{src}</span>: {v.claimed}✓ / {v.unclaimed}✗
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── 5. UAE Geo ── */}
        <Card>
          <CardHeader className="py-2 px-3"><CardTitle className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" />UAE Geography</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-[9px] text-muted-foreground mb-1 uppercase">By Emirate</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(geoStats.byRegion).sort(([, a], [, b]) => b - a).map(([r, c]) => (
                  <Badge key={r} variant="outline" className="text-[10px]">{r}: {c}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground mb-1 uppercase">Top Cities</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(geoStats.byCity).sort(([, a], [, b]) => b - a).slice(0, 15).map(([c, n]) => (
                  <Badge key={c} variant="secondary" className="text-[9px]">{c}: {n}</Badge>
                ))}
              </div>
            </div>
            {geoStats.dirtyZones.length > 0 && (
              <div>
                <p className="text-[9px] text-destructive mb-1 uppercase">Overloaded Zones (&gt;20)</p>
                <div className="flex flex-wrap gap-1.5">
                  {geoStats.dirtyZones.map(z => (
                    <Badge key={z.zone} variant="destructive" className="text-[9px]">{z.zone}: {z.count}</Badge>
                  ))}
                </div>
              </div>
            )}
            {geoStats.emptyZones.length > 0 && geoStats.emptyZones.length <= 10 && (
              <div>
                <p className="text-[9px] text-muted-foreground mb-1 uppercase">Empty Zones (≤1 shop)</p>
                <div className="flex flex-wrap gap-1.5">
                  {geoStats.emptyZones.map(z => (
                    <Badge key={z} variant="outline" className="text-[9px]">{z}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 12. Top Blockers ── */}
        {topBlockers.length > 0 && (
          <Card>
            <CardHeader className="py-2 px-3"><CardTitle className="text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Top Blockers</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {topBlockers.map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-destructive/5">
                  <span className="text-muted-foreground truncate max-w-[70%]">{reason}</span>
                  <Badge variant="destructive" className="text-[9px] h-4">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── 11. Bulk Actions ── */}
        <Card>
          <CardHeader className="py-2 px-3"><CardTitle className="text-xs flex items-center gap-1"><Wrench className="h-3 w-3" />Bulk Actions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={handleBulkAudit} disabled={!!bulkRunning} className="text-[10px] h-7 gap-1">
              {bulkRunning === "audit" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Recalc Audit ({filtered.length})
            </Button>
            <Button size="sm" variant="outline" onClick={handleRunCleaning} disabled={cleaning} className="text-[10px] h-7 gap-1">
              {cleaning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wrench className="h-3 w-3" />}
              {cleaning ? cleaningProgress : "Full Cleaning Pipeline"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleHideBlocked} disabled={!!bulkRunning} className="text-[10px] h-7 gap-1">
              {bulkRunning === "hide" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
              Hide Blocked
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportCsv} className="text-[10px] h-7 gap-1">
              <Download className="h-3 w-3" /> Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={fetchShops} className="text-[10px] h-7 gap-1">
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </CardContent>
          {cleaningResult && (
            <CardContent className="pt-0">
              <div className="p-2 bg-muted rounded text-[10px] space-y-0.5">
                <p className="font-medium text-foreground">Cleaning Results:</p>
                <p>Processed: {cleaningResult.totalProcessed} | Dups hidden: {cleaningResult.duplicatesHidden} | Tax fixed: {cleaningResult.taxonomyFixed}</p>
                <p>Covers fixed: {cleaningResult.coversFixed} | Source fixed: {cleaningResult.sourceFixed} | Audit recalc: {cleaningResult.auditRecalculated}</p>
                <p>Visibility fixed: {cleaningResult.visibilityFixed} | Routes fixed: {cleaningResult.routesFixed}</p>
                {cleaningResult.errors.length > 0 && <p className="text-destructive">Errors: {cleaningResult.errors.length}</p>}
              </div>
            </CardContent>
          )}
        </Card>

        {/* ── 10. Detailed Table ── */}
        <Card>
          <CardHeader className="py-2 px-3"><CardTitle className="text-xs">Shops ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      {["Name", "Src", "Region", "City", "Vert", "Sub", "Score", "Status", "Vis", "Claimed", "Menu", "Photo", "Dup", "Route", "Blk"].map(h => (
                        <th key={h} className="text-left px-1.5 py-1.5 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 150).map(s => {
                      const blockers = getBlockers(s);
                      const isDup = hasDupCover(s, coverMap);
                      return (
                        <tr key={s.id} className="border-b hover:bg-muted/20">
                          <td className="px-1.5 py-1 font-medium max-w-[120px] truncate">{s.name || "—"}</td>
                          <td className="px-1.5 py-1"><Badge variant="secondary" className="text-[8px] h-4">{s.source_type || "—"}</Badge></td>
                          <td className="px-1.5 py-1 text-muted-foreground">{s.region || "—"}</td>
                          <td className="px-1.5 py-1 text-muted-foreground">{s.city || "—"}</td>
                          <td className="px-1.5 py-1">{s.vertical || "—"}</td>
                          <td className="px-1.5 py-1 text-muted-foreground">{s.subcategory || "—"}</td>
                          <td className="px-1.5 py-1 font-mono">{s.audit_score ?? "—"}</td>
                          <td className="px-1.5 py-1">
                            <Badge variant={s.readiness_status === "ready" || s.readiness_status === "live" ? "default" : "secondary"} className="text-[8px] h-4">
                              {s.readiness_status || "—"}
                            </Badge>
                          </td>
                          <td className="px-1.5 py-1">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                              s.visibility_mode === "live" ? "bg-green-500" :
                              s.visibility_mode === "ready" ? "bg-blue-500" :
                              s.visibility_mode === "coming_soon" ? "bg-orange-400" :
                              s.visibility_mode === "hidden" ? "bg-muted-foreground" : "bg-sky-400"
                            }`} />
                            <span className="text-muted-foreground">{(s.visibility_mode || "—").replace("_", " ")}</span>
                          </td>
                          <td className="px-1.5 py-1">{s.is_claimed ? <CheckCircle2 className="h-3 w-3 text-primary" /> : "—"}</td>
                          <td className="px-1.5 py-1">{s.has_menu || (s.products_count ?? 0) > 0 ? "✓" : "—"}</td>
                          <td className="px-1.5 py-1">{hasCover(s) ? "✓" : "—"}</td>
                          <td className="px-1.5 py-1">{isDup ? <AlertTriangle className="h-3 w-3 text-orange-500" /> : "—"}</td>
                          <td className="px-1.5 py-1">
                            {s.route_status === "broken" ? <AlertTriangle className="h-3 w-3 text-destructive" /> :
                             s.route_status === "warning" ? <AlertTriangle className="h-3 w-3 text-yellow-500" /> :
                             <CheckCircle2 className="h-3 w-3 text-primary" />}
                          </td>
                          <td className="px-1.5 py-1">
                            {blockers.length > 0 ? <Badge variant="destructive" className="text-[8px] h-4">{blockers.length}</Badge> : <CheckCircle2 className="h-3 w-3 text-primary" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filtered.length > 150 && (
                <p className="text-center text-[9px] text-muted-foreground py-2">Showing 150 of {filtered.length}. Export CSV for full data.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
