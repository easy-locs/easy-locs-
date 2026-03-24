/**
 * useOpsDashboard — Hook for UAE Operations Dashboard.
 * Computes KPIs, audit issues, geo stats, display quality, routing, visibility, rankings.
 * Uses React Query for data fetching.
 */
import { useMemo, useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { auditShop, type ShopAuditResult } from "@/lib/audit/shop-audit";
import { runFullCleaningPipeline, type CleaningResult } from "@/lib/cleaning/data-cleaning-pipeline";
import { batchSafeAutoWrite } from "@/lib/engines/override-write-gate";
import { toast } from "sonner";

// ── Types ──
export interface ShopRow {
  id: string; name: string; slug: string; city: string; country: string;
  region: string; vertical: string; cluster: string; subcategory: string;
  source_type: string; source_confidence: number; audit_score: number;
  readiness_status: string; activation_status: string;
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

export interface OpsFilters {
  country: string; region: string; city: string; vertical: string;
  sourceType: string; readiness: string; visibility: string;
  claimed: string; hasPhoto: string; hasMenu: string; hasRating: string;
  dupImage: string; taxMismatch: string; brokenRoute: string;
}

export const DEFAULT_FILTERS: OpsFilters = {
  country: "all", region: "all", city: "all", vertical: "all",
  sourceType: "all", readiness: "all", visibility: "all", claimed: "all",
  hasPhoto: "all", hasMenu: "all", hasRating: "all",
  dupImage: "all", taxMismatch: "all", brokenRoute: "all",
};

// ── Helpers ──
export function getBlockers(shop: any): string[] { return auditShop(shop).blockers; }

export function hasCover(s: any): boolean {
  return !!(s.cover_owner_url || s.cover_auto_url || s.cover_url || s.banner_url);
}

export function hasDupCover(s: any, coverMap: Map<string, number>): boolean {
  const c = s.cover_owner_url || s.cover_auto_url || s.cover_url || s.banner_url;
  return c ? (coverMap.get(c) || 0) > 1 : false;
}

export function hasTaxMismatch(s: any): boolean {
  return !s.vertical || (!s.subcategory && !s.cluster);
}

// ── KPI computation ──
export function computeKpis(shops: ShopRow[]) {
  const total = shops.length;
  return {
    total,
    draft: shops.filter(s => s.readiness_status === "draft").length,
    needsReview: shops.filter(s => s.readiness_status === "needs_review").length,
    ready: shops.filter(s => s.readiness_status === "ready").length,
    live: shops.filter(s => s.readiness_status === "live" || s.visibility_mode === "live").length,
    comingSoon: shops.filter(s => s.visibility_mode === "coming_soon").length,
    searchOnly: shops.filter(s => s.visibility_mode === "search_only").length,
    mapOnly: shops.filter(s => s.visibility_mode === "map_only").length,
    hidden: shops.filter(s => s.visibility_mode === "hidden").length,
    publishable: shops.filter(s => auditShop(s).isPublishable).length,
    blocked: shops.filter(s => getBlockers(s).length > 0).length,
    claimed: shops.filter(s => s.is_claimed).length,
    unclaimed: shops.filter(s => !s.is_claimed).length,
    avgScore: total > 0 ? Math.round(shops.reduce((a, s) => a + (s.audit_score ?? 0), 0) / total) : 0,
  };
}

// ── Audit issues ──
export function computeAuditIssues(shops: ShopRow[], coverMap: Map<string, number>) {
  return {
    noCover: shops.filter(s => !hasCover(s)).length,
    dupCover: shops.filter(s => hasDupCover(s, coverMap)).length,
    invalidTax: shops.filter(s => hasTaxMismatch(s)).length,
    noContact: shops.filter(s => !s.contact_phone && !s.phone).length,
    foodNoMenu: shops.filter(s => s.vertical === "food" && !s.has_menu && (s.products_count ?? 0) === 0).length,
    noRating: shops.filter(s => !s.rating).length,
    withBlockers: shops.filter(s => getBlockers(s).length > 0).length,
    weakScore: shops.filter(s => (s.audit_score ?? 0) < 50).length,
  };
}

// ── Source hygiene ──
export function computeSourceStats(shops: ShopRow[]) {
  const byType: Record<string, number> = {};
  let totalConf = 0, confCount = 0;
  const claimedBySource: Record<string, { claimed: number; unclaimed: number }> = {};
  let autoGen = 0, ownerVerified = 0;
  for (const s of shops) {
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
    claimedBySource, importedToday: shops.filter(s => s.created_at?.startsWith(today)).length,
    autoGen, ownerVerified,
  };
}

// ── Geo stats ──
export function computeGeoStats(shops: ShopRow[]) {
  const byRegion: Record<string, number> = {};
  const byCity: Record<string, number> = {};
  for (const s of shops) {
    byRegion[s.region || "Unknown"] = (byRegion[s.region || "Unknown"] || 0) + 1;
    byCity[s.city || "Unknown"] = (byCity[s.city || "Unknown"] || 0) + 1;
  }
  return {
    byRegion, byCity,
    emptyZones: Object.entries(byCity).filter(([, c]) => c <= 1).map(([z]) => z),
    dirtyZones: Object.entries(byCity).filter(([, c]) => c > 20).map(([z, c]) => ({ zone: z, count: c })),
  };
}

// ── Display quality ──
export function computeDisplayQuality(shops: ShopRow[], coverMap: Map<string, number>) {
  return {
    noCoverCards: shops.filter(s => !hasCover(s)).length,
    dupCoverCards: shops.filter(s => hasDupCover(s, coverMap)).length,
    emptyAddress: shops.filter(s => !s.address && !s.region).length,
    missingCategory: shops.filter(s => !s.subcategory && !s.cluster).length,
    missingRatingBadge: shops.filter(s => !s.rating && s.visibility_mode !== "hidden").length,
    incompleteMapPins: shops.filter(s => (!s.latitude && !s.longitude) && s.visibility_mode !== "hidden").length,
  };
}

// ── Routing integrity ──
export function computeRoutingStats(shops: ShopRow[]) {
  return {
    brokenRoutes: shops.filter(s => s.route_status === "broken" || (!s.slug && !s.id)).length,
    warningRoutes: shops.filter(s => s.route_status === "warning").length,
    validRoutes: shops.filter(s => s.route_status === "valid" || (!s.route_status && s.slug)).length,
    noSlug: shops.filter(s => !s.slug).length,
  };
}

// ── Visibility breakdown ──
export function computeVisibilityModes(shops: ShopRow[]) {
  const modes: Record<string, number> = { hidden: 0, map_only: 0, search_only: 0, coming_soon: 0, ready: 0, live: 0 };
  for (const s of shops) { const m = s.visibility_mode || "coming_soon"; modes[m] = (modes[m] || 0) + 1; }
  return modes;
}

// ── Top blockers ──
export function computeTopBlockers(shops: ShopRow[]) {
  const counts: Record<string, number> = {};
  for (const s of shops) { for (const b of getBlockers(s)) counts[b] = (counts[b] || 0) + 1; }
  return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 12);
}

// ── Filter options ──
export function computeFilterOptions(shops: ShopRow[]) {
  return {
    countries: [...new Set(shops.map(s => s.country).filter(Boolean))],
    regions: [...new Set(shops.map(s => s.region).filter(Boolean))],
    cities: [...new Set(shops.map(s => s.city).filter(Boolean))],
    verticals: [...new Set(shops.map(s => s.vertical).filter(Boolean))],
    sourceTypes: [...new Set(shops.map(s => s.source_type).filter(Boolean))],
  };
}

// ── Filter logic ──
export function applyFilters(shops: ShopRow[], filters: OpsFilters, coverMap: Map<string, number>): ShopRow[] {
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
}

// ══════════════════════════════════════════
//  MAIN HOOK
// ══════════════════════════════════════════
export function useOpsDashboard() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<OpsFilters>(DEFAULT_FILTERS);
  const [cleaning, setCleaning] = useState(false);
  const [cleaningProgress, setCleaningProgress] = useState("");
  const [cleaningResult, setCleaningResult] = useState<CleaningResult | null>(null);
  const [bulkRunning, setBulkRunning] = useState<string | null>(null);

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ["ops-dashboard-shops"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("storefront_pages").select("*")
        .order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return (data || []) as ShopRow[];
    },
  });

  const coverMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of shops) {
      const c = s.cover_owner_url || s.cover_auto_url || s.cover_url || s.banner_url;
      if (c) m.set(c, (m.get(c) || 0) + 1);
    }
    return m;
  }, [shops]);

  const filtered = useMemo(() => applyFilters(shops, filters, coverMap), [shops, filters, coverMap]);
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const auditIssues = useMemo(() => computeAuditIssues(filtered, coverMap), [filtered, coverMap]);
  const sourceStats = useMemo(() => computeSourceStats(filtered), [filtered]);
  const geoStats = useMemo(() => computeGeoStats(filtered), [filtered]);
  const displayQuality = useMemo(() => computeDisplayQuality(filtered, coverMap), [filtered, coverMap]);
  const routingStats = useMemo(() => computeRoutingStats(filtered), [filtered]);
  const visibilityModes = useMemo(() => computeVisibilityModes(filtered), [filtered]);
  const topBlockers = useMemo(() => computeTopBlockers(filtered), [filtered]);
  const filterOptions = useMemo(() => computeFilterOptions(shops), [shops]);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["ops-dashboard-shops"] });
  }, [queryClient]);

  const setFilter = useCallback((key: keyof OpsFilters, value: string) => {
    setFilters(f => ({ ...f, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  // ── Bulk actions ──
  const runCleaning = useCallback(async () => {
    setCleaning(true); setCleaningResult(null);
    try {
      const res = await runFullCleaningPipeline((step, done, total) =>
        setCleaningProgress(`${step} (${done}/${total})`)
      );
      setCleaningResult(res);
      toast.success(`Cleaning complete: ${res.totalProcessed} shops processed`);
      refetch();
    } catch (e: any) { toast.error(e.message); }
    finally { setCleaning(false); setCleaningProgress(""); }
  }, [refetch]);

  const runBulkAudit = useCallback(async () => {
    setBulkRunning("audit");
    let count = 0;
    for (const shop of filtered) {
      const audit = auditShop(shop);
      await batchSafeAutoWrite(shop.id, {
        audit_score: audit.score,
        readiness_status: audit.status,
      }, "ops_bulk_audit");
      count++;
    }
    toast.success(`Audit recalculated for ${count} shops`);
    setBulkRunning(null); refetch();
  }, [filtered, refetch]);

  const hideBlocked = useCallback(async () => {
    setBulkRunning("hide");
    let count = 0;
    for (const shop of filtered) {
      if (getBlockers(shop).length > 0 && shop.visibility_mode !== "hidden") {
        await batchSafeAutoWrite(shop.id, {
          visibility_mode: "hidden",
          blocking_reason: getBlockers(shop).slice(0, 3).join("; "),
        }, "ops_hide_blocked");
        count++;
      }
    }
    toast.success(`${count} blocked shops hidden`);
    setBulkRunning(null); refetch();
  }, [filtered, refetch]);

  const exportCsv = useCallback(() => {
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
  }, [filtered]);

  return {
    shops, filtered, isLoading, coverMap,
    filters, setFilter, resetFilters, filterOptions,
    kpis, auditIssues, sourceStats, geoStats,
    displayQuality, routingStats, visibilityModes, topBlockers,
    cleaning, cleaningProgress, cleaningResult, bulkRunning,
    runCleaning, runBulkAudit, hideBlocked, exportCsv, refetch,
  };
}
