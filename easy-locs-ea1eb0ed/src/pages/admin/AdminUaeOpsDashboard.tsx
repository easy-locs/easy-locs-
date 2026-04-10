/**
 * UAE Operations Dashboard — Full admin control center.
 * Refactored to use useOpsDashboard hook for clean separation.
 */
import { useOpsDashboard, hasCover, hasDupCover, getBlockers, type ShopRow } from "@/hooks/useOpsDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, RefreshCw, Download, AlertTriangle, CheckCircle2,
  MapPin, Store, Shield, Wrench, Eye, Router, Layers
} from "lucide-react";
import type { OpsFilters } from "@/hooks/useOpsDashboard";

// ── Reusable sub-components ──
const KpiCard = ({ label, value, color = "text-foreground" }: { label: string; value: number; color?: string }) => (
  <Card className="p-2">
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">{label}</p>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </Card>
);

const QRow = ({ label, value, bad = true }: { label: string; value: number; bad?: boolean }) => (
  <div className="flex items-center justify-between p-1.5 rounded bg-muted/50">
    <span className="text-[10px] text-muted-foreground">{label}</span>
    <Badge variant={bad && value > 0 ? "destructive" : "secondary"} className="text-[10px] h-5">{value}</Badge>
  </div>
);

const FilterSelect = ({ label, fk, options, filters, setFilter }: {
  label: string; fk: keyof OpsFilters; options: string[];
  filters: OpsFilters; setFilter: (k: keyof OpsFilters, v: string) => void;
}) => (
  <Select value={filters[fk]} onValueChange={v => setFilter(fk, v)}>
    <SelectTrigger className="h-7 text-[10px] w-[110px]"><SelectValue placeholder={label} /></SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All {label}</SelectItem>
      {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
    </SelectContent>
  </Select>
);

const VIS_COLORS: Record<string, string> = {
  live: "bg-green-500", ready: "bg-blue-500", coming_soon: "bg-orange-400",
  search_only: "bg-sky-400", map_only: "bg-cyan-500", hidden: "bg-muted-foreground",
};

export default function AdminUaeOpsDashboard() {
  const {
    shops, filtered, isLoading, coverMap,
    filters, setFilter, resetFilters, filterOptions,
    kpis, auditIssues, sourceStats, geoStats,
    displayQuality, routingStats, visibilityModes, topBlockers,
    cleaning, cleaningProgress, cleaningResult, bulkRunning,
    runCleaning, runBulkAudit, hideBlocked, exportCsv, refetch,
  } = useOpsDashboard();

  if (isLoading) return (
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
            <FilterSelect label="Country" fk="country" options={filterOptions.countries} filters={filters} setFilter={setFilter} />
            <FilterSelect label="Region" fk="region" options={filterOptions.regions} filters={filters} setFilter={setFilter} />
            <FilterSelect label="City" fk="city" options={filterOptions.cities} filters={filters} setFilter={setFilter} />
            <FilterSelect label="Vertical" fk="vertical" options={filterOptions.verticals} filters={filters} setFilter={setFilter} />
            <FilterSelect label="Source" fk="sourceType" options={filterOptions.sourceTypes} filters={filters} setFilter={setFilter} />
            <FilterSelect label="Readiness" fk="readiness" options={["draft", "needs_review", "ready", "live"]} filters={filters} setFilter={setFilter} />
            <FilterSelect label="Visibility" fk="visibility" options={["hidden", "map_only", "search_only", "coming_soon", "ready", "live"]} filters={filters} setFilter={setFilter} />
            <FilterSelect label="Claimed" fk="claimed" options={["yes", "no"]} filters={filters} setFilter={setFilter} />
            <FilterSelect label="Photos" fk="hasPhoto" options={["yes", "no"]} filters={filters} setFilter={setFilter} />
            <FilterSelect label="Menu" fk="hasMenu" options={["yes", "no"]} filters={filters} setFilter={setFilter} />
            <FilterSelect label="Rating" fk="hasRating" options={["yes", "no"]} filters={filters} setFilter={setFilter} />
            <FilterSelect label="Dup Image" fk="dupImage" options={["yes", "no"]} filters={filters} setFilter={setFilter} />
            <FilterSelect label="Tax Error" fk="taxMismatch" options={["yes", "no"]} filters={filters} setFilter={setFilter} />
            <FilterSelect label="Broken Route" fk="brokenRoute" options={["yes", "no"]} filters={filters} setFilter={setFilter} />
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-[10px] h-7">Reset</Button>
          </CardContent>
        </Card>

        {/* ── Tabbed sections ── */}
        <Tabs defaultValue="audit" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-8">
            <TabsTrigger value="audit" className="text-[10px] gap-1"><Shield className="h-3 w-3" />Audit</TabsTrigger>
            <TabsTrigger value="display" className="text-[10px] gap-1"><Eye className="h-3 w-3" />Display</TabsTrigger>
            <TabsTrigger value="routing" className="text-[10px] gap-1"><Router className="h-3 w-3" />Routing</TabsTrigger>
            <TabsTrigger value="source" className="text-[10px] gap-1"><Store className="h-3 w-3" />Source</TabsTrigger>
          </TabsList>

          {/* 3. Audit Quality */}
          <TabsContent value="audit">
            <Card>
              <CardHeader className="py-2 px-3"><CardTitle className="text-xs">Audit Quality</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <QRow label="Missing cover" value={auditIssues.noCover} />
                <QRow label="Duplicate covers" value={auditIssues.dupCover} />
                <QRow label="Invalid taxonomy" value={auditIssues.invalidTax} />
                <QRow label="No contact" value={auditIssues.noContact} />
                <QRow label="Food w/o menu" value={auditIssues.foodNoMenu} />
                <QRow label="No rating" value={auditIssues.noRating} bad={false} />
                <QRow label="With blockers" value={auditIssues.withBlockers} />
                <QRow label="Score < 50" value={auditIssues.weakScore} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 6. Display Quality */}
          <TabsContent value="display">
            <Card>
              <CardHeader className="py-2 px-3"><CardTitle className="text-xs">Display Quality Control</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <QRow label="Cards w/o cover" value={displayQuality.noCoverCards} />
                <QRow label="Duplicate covers" value={displayQuality.dupCoverCards} />
                <QRow label="Empty address" value={displayQuality.emptyAddress} />
                <QRow label="Missing category" value={displayQuality.missingCategory} />
                <QRow label="No rating badge" value={displayQuality.missingRatingBadge} bad={false} />
                <QRow label="No map coords" value={displayQuality.incompleteMapPins} />
              </CardContent>
            </Card>
            {/* 8. Visibility Modes */}
            <Card className="mt-3">
              <CardHeader className="py-2 px-3"><CardTitle className="text-xs flex items-center gap-1"><Layers className="h-3 w-3" />Visibility Modes</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(visibilityModes).map(([mode, count]) => (
                  <div key={mode} className="flex items-center gap-1.5 p-2 rounded bg-muted/50 min-w-[100px]">
                    <div className={`w-2 h-2 rounded-full ${VIS_COLORS[mode] || "bg-muted-foreground"}`} />
                    <span className="text-[10px] text-muted-foreground">{mode.replace(/_/g, " ")}</span>
                    <span className="text-xs font-bold ml-auto">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 7. Routing Integrity */}
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

          {/* 4. Source Hygiene */}
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
                    <div key={src} className="text-[10px] bg-muted p-1.5 rounded">
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
              <p className="text-[10px] text-muted-foreground mb-1 uppercase">By Emirate</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(geoStats.byRegion).sort(([, a], [, b]) => b - a).map(([r, c]) => (
                  <Badge key={r} variant="outline" className="text-[10px]">{r}: {c}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1 uppercase">Top Cities</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(geoStats.byCity).sort(([, a], [, b]) => b - a).slice(0, 15).map(([c, n]) => (
                  <Badge key={c} variant="secondary" className="text-[10px]">{c}: {n}</Badge>
                ))}
              </div>
            </div>
            {geoStats.dirtyZones.length > 0 && (
              <div>
                <p className="text-[10px] text-destructive mb-1 uppercase">Overloaded Zones (&gt;20)</p>
                <div className="flex flex-wrap gap-1.5">
                  {geoStats.dirtyZones.map(z => (
                    <Badge key={z.zone} variant="destructive" className="text-[10px]">{z.zone}: {z.count}</Badge>
                  ))}
                </div>
              </div>
            )}
            {geoStats.emptyZones.length > 0 && geoStats.emptyZones.length <= 10 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1 uppercase">Empty Zones (≤1 shop)</p>
                <div className="flex flex-wrap gap-1.5">
                  {geoStats.emptyZones.map(z => (
                    <Badge key={z} variant="outline" className="text-[10px]">{z}</Badge>
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
                  <Badge variant="destructive" className="text-[10px] h-4">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── 11. Bulk Actions ── */}
        <Card>
          <CardHeader className="py-2 px-3"><CardTitle className="text-xs flex items-center gap-1"><Wrench className="h-3 w-3" />Bulk Actions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={runBulkAudit} disabled={!!bulkRunning} className="text-[10px] h-7 gap-1">
              {bulkRunning === "audit" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Recalc Audit ({filtered.length})
            </Button>
            <Button size="sm" variant="outline" onClick={runCleaning} disabled={cleaning} className="text-[10px] h-7 gap-1">
              {cleaning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wrench className="h-3 w-3" />}
              {cleaning ? cleaningProgress : "Full Cleaning Pipeline"}
            </Button>
            <Button size="sm" variant="outline" onClick={hideBlocked} disabled={!!bulkRunning} className="text-[10px] h-7 gap-1">
              {bulkRunning === "hide" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
              Hide Blocked
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv} className="text-[10px] h-7 gap-1">
              <Download className="h-3 w-3" /> Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={refetch} className="text-[10px] h-7 gap-1">
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
                          <td className="px-1.5 py-1"><Badge variant="secondary" className="text-[10px] h-4">{s.source_type || "—"}</Badge></td>
                          <td className="px-1.5 py-1 text-muted-foreground">{s.region || "—"}</td>
                          <td className="px-1.5 py-1 text-muted-foreground">{s.city || "—"}</td>
                          <td className="px-1.5 py-1">{s.vertical || "—"}</td>
                          <td className="px-1.5 py-1 text-muted-foreground">{s.subcategory || "—"}</td>
                          <td className="px-1.5 py-1 font-mono">{s.audit_score ?? "—"}</td>
                          <td className="px-1.5 py-1">
                            <Badge variant={s.readiness_status === "ready" || s.readiness_status === "live" ? "default" : "secondary"} className="text-[10px] h-4">
                              {s.readiness_status || "—"}
                            </Badge>
                          </td>
                          <td className="px-1.5 py-1">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${VIS_COLORS[s.visibility_mode] || "bg-muted-foreground"}`} />
                            <span className="text-muted-foreground">{(s.visibility_mode || "—").replace(/_/g, " ")}</span>
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
                            {blockers.length > 0 ? <Badge variant="destructive" className="text-[10px] h-4">{blockers.length}</Badge> : <CheckCircle2 className="h-3 w-3 text-primary" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filtered.length > 150 && (
                <p className="text-center text-[10px] text-muted-foreground py-2">Showing 150 of {filtered.length}. Export CSV for full data.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
