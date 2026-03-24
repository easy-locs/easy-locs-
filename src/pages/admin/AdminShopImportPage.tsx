import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { runImportPipeline, parseImportJson, type PipelineResult } from "@/lib/import/shop-import-pipeline";
import { publishCandidateAsSeed, autoClassifyVisibility } from "@/lib/import/visibility-engine";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const UAE_CITIES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"];
const SOURCES = ["google_maps", "deliveroo", "talabat", "careem", "booking", "manual", "csv", "json_batch"];

const DEMO_DATA = JSON.stringify([
  {
    name: "Al Mallah Restaurant",
    category: "restaurant",
    subcategory: "lebanese",
    phone: "+971501234567",
    address: "2nd December Street, Satwa",
    city: "Dubai",
    area: "Al Satwa",
    lat: 25.2285,
    lng: 55.2744,
    rating: 4.5,
    reviews_count: 1250,
    price_level: 2,
    images: ["https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400"],
  },
  {
    name: "Ravi Restaurant",
    category: "restaurant",
    subcategory: "pakistani",
    phone: "+971502345678",
    address: "Al Satwa Road",
    city: "Dubai",
    area: "Al Satwa",
    lat: 25.2290,
    lng: 55.2750,
    rating: 4.3,
    reviews_count: 3200,
    price_level: 1,
  },
], null, 2);

export default function AdminShopImportPage() {
  const navigate = useNavigate();
  const [sourceType, setSourceType] = useState("manual");
  const [sourceName, setSourceName] = useState("");
  const [city, setCity] = useState("Dubai");
  const [jsonText, setJsonText] = useState(DEMO_DATA);
  const [running, setRunning] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);

  // Dashboard state
  const [batches, setBatches] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, review: 0, low: 0, duplicates: 0 });
  const [visualStats, setVisualStats] = useState({ needsAssets: 0, goodUi: 0, poorMenu: 0, emptyMenu: 0, storefrontReady: 0 });
  const [filter, setFilter] = useState({ city: "", vertical: "", status: "" });
  const [onboardingStates, setOnboardingStates] = useState<any[]>([]);
  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const [batchRes, candRes, stateRes] = await Promise.all([
      (supabase as any).from("import_batches").select("*").order("created_at", { ascending: false }).limit(20),
      (supabase as any).from("onboarding_shop_candidates").select("*").order("created_at", { ascending: false }).limit(200),
      (supabase as any).from("merchant_onboarding_state").select("entity_id, ui_quality_status, menu_visual_status, storefront_ready_status, menu_display_score, visual_completeness_score, storefront_readiness_score, visual_flags_json").limit(500),
    ]);
    setBatches(batchRes.data ?? []);
    const cands = candRes.data ?? [];
    setCandidates(cands);
    const states = stateRes.data ?? [];
    setOnboardingStates(states);
    setStats({
      total: cands.length,
      approved: cands.filter((c: any) => c.candidate_status === "approved").length,
      review: cands.filter((c: any) => c.candidate_status === "review").length,
      low: cands.filter((c: any) => c.candidate_status === "low_quality").length,
      duplicates: cands.filter((c: any) => c.duplicate_group_id).length,
    });
    setVisualStats({
      needsAssets: states.filter((s: any) => s.ui_quality_status === "needs_assets").length,
      goodUi: states.filter((s: any) => s.ui_quality_status === "good").length,
      poorMenu: states.filter((s: any) => s.menu_visual_status === "poor").length,
      emptyMenu: states.filter((s: any) => s.menu_visual_status === "empty").length,
      storefrontReady: states.filter((s: any) => s.storefront_ready_status === "ready").length,
    });
  }

  async function handleImport() {
    try {
      setRunning(true);
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        toast.error("JSON must be an array");
        return;
      }
      const items = parseImportJson(parsed);
      const result = await runImportPipeline(
        { source_type: sourceType, source_name: sourceName || sourceType, city, country: "AE" },
        items
      );
      setPipelineResult(result);
      toast.success(`Import: ${result.total_created} created, ${result.total_duplicates} dupes, ${result.total_failed} failed`);
      loadDashboard();
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setRunning(false);
    }
  }

  async function updateCandidateStatus(id: string, status: string) {
    await (supabase as any).from("onboarding_shop_candidates").update({ candidate_status: status }).eq("id", id);
    loadDashboard();
    toast.success(`Status updated to ${status}`);
  }

  const filteredCandidates = candidates.filter((c: any) => {
    if (filter.city && c.city !== filter.city) return false;
    if (filter.vertical && c.canonical_vertical !== filter.vertical) return false;
    if (filter.status && c.candidate_status !== filter.status) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-foreground p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-sm">←</button>
        <div>
          <h1 className="text-lg font-bold">UAE Shop Import Engine</h1>
          <p className="text-xs text-muted-foreground">Import only • No activation messages</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Approved", value: stats.approved, color: "text-emerald-500" },
          { label: "Review", value: stats.review, color: "text-amber-500" },
          { label: "Low", value: stats.low, color: "text-destructive" },
          { label: "Dupes", value: stats.duplicates, color: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-card border border-border p-3 text-center">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Visual Quality Stats */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
        <h2 className="text-sm font-bold">🎨 Visual Quality</h2>
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "Needs Assets", value: visualStats.needsAssets, color: "text-amber-500" },
            { label: "Good UI", value: visualStats.goodUi, color: "text-emerald-500" },
            { label: "Poor Menu", value: visualStats.poorMenu, color: "text-destructive" },
            { label: "Empty Menu", value: visualStats.emptyMenu, color: "text-muted-foreground" },
            { label: "SF Ready", value: visualStats.storefrontReady, color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-muted p-2 text-center">
              <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[9px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
        {onboardingStates.length > 0 && (
          <div className="text-[10px] text-muted-foreground mt-1">
            Avg menu score: {Math.round(onboardingStates.reduce((s: number, o: any) => s + (o.menu_display_score || 0), 0) / onboardingStates.length)} · 
            Avg visual: {Math.round(onboardingStates.reduce((s: number, o: any) => s + (o.visual_completeness_score || 0), 0) / onboardingStates.length)} · 
            Avg storefront: {Math.round(onboardingStates.reduce((s: number, o: any) => s + (o.storefront_readiness_score || 0), 0) / onboardingStates.length)}
          </div>
        )}
      </div>
      {/* Import Form */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <h2 className="text-sm font-bold">New Import Batch</h2>
        <div className="grid grid-cols-2 gap-2">
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="rounded-xl bg-muted px-3 py-2 text-xs">
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-xl bg-muted px-3 py-2 text-xs">
            {UAE_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <input
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          placeholder="Source name (optional)"
          className="w-full rounded-xl bg-muted px-3 py-2 text-xs"
        />
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={12}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono resize-none"
          placeholder="Paste JSON array of shops..."
        />
        <button
          onClick={handleImport}
          disabled={running}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
        >
          {running ? "Importing..." : "🚀 Run Import Pipeline"}
        </button>
        <button
          onClick={async () => {
            const res = await autoClassifyVisibility();
            toast.success(`Auto-classified ${res.updated} candidates`);
            loadDashboard();
          }}
          className="w-full rounded-2xl bg-muted text-foreground px-4 py-2.5 text-xs font-bold"
        >
          🔄 Auto-Classify Visibility
        </button>
      </div>

      {/* Pipeline Result */}
      {pipelineResult && (
        <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
          <h3 className="text-sm font-bold">Pipeline Result</h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-muted rounded-lg p-2 text-center">
              <div className="font-bold text-emerald-500">{pipelineResult.total_created}</div>
              <div className="text-muted-foreground">Created</div>
            </div>
            <div className="bg-muted rounded-lg p-2 text-center">
              <div className="font-bold text-amber-500">{pipelineResult.total_duplicates}</div>
              <div className="text-muted-foreground">Duplicates</div>
            </div>
            <div className="bg-muted rounded-lg p-2 text-center">
              <div className="font-bold text-destructive">{pipelineResult.total_failed}</div>
              <div className="text-muted-foreground">Failed</div>
            </div>
          </div>
          {pipelineResult.errors.length > 0 && (
            <div className="space-y-1 mt-2">
              {pipelineResult.errors.map((e, i) => (
                <div key={i} className="text-xs text-destructive">{e.name}: {e.error}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <select value={filter.city} onChange={(e) => setFilter({ ...filter, city: e.target.value })} className="rounded-xl bg-muted px-3 py-1.5 text-xs flex-1">
          <option value="">All Cities</option>
          {UAE_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filter.vertical} onChange={(e) => setFilter({ ...filter, vertical: e.target.value })} className="rounded-xl bg-muted px-3 py-1.5 text-xs flex-1">
          <option value="">All Verticals</option>
          {["food", "grocery", "shops", "services", "property", "healthcare"].map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="rounded-xl bg-muted px-3 py-1.5 text-xs flex-1">
          <option value="">All Status</option>
          {["approved", "review", "low_quality", "pending"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Batches */}
      {batches.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold">Recent Batches</h3>
          {batches.map((b: any) => (
            <div key={b.id} className="rounded-xl bg-card border border-border p-3 flex justify-between items-center">
              <div>
                <div className="text-xs font-semibold">{b.source_name || b.source_type} · {b.city}</div>
                <div className="text-[10px] text-muted-foreground">
                  {b.total_created} created · {b.total_duplicates} dupes · {b.status}
                </div>
              </div>
              <div className={`text-[10px] px-2 py-0.5 rounded-full ${b.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                {b.status}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidates List */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold">Candidates ({filteredCandidates.length})</h3>
        {filteredCandidates.map((c: any) => (
          <div key={c.id} className="rounded-xl bg-card border border-border p-3 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold">{c.canonical_name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {c.canonical_vertical} · {c.canonical_subcategory} · {c.city} · {c.zone}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Score: {c.quality_score} · {c.phone || "no phone"} · {c.rating ? `★${c.rating}` : "no rating"}
                </div>
              </div>
              <div className={`text-[10px] px-2 py-0.5 rounded-full ${
                c.candidate_status === "approved" ? "bg-emerald-500/10 text-emerald-500"
                : c.candidate_status === "review" ? "bg-amber-500/10 text-amber-500"
                : "bg-destructive/10 text-destructive"
              }`}>
                {c.candidate_status}
              </div>
            </div>
            {c.duplicate_group_id && (
              <div className="text-[10px] text-amber-500">⚠️ Potential duplicate</div>
            )}
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => updateCandidateStatus(c.id, "approved")} className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500">Approve</button>
              <button onClick={() => updateCandidateStatus(c.id, "review")} className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500">Review</button>
              <button onClick={() => updateCandidateStatus(c.id, "rejected")} className="text-[10px] px-2 py-1 rounded-lg bg-destructive/10 text-destructive">Reject</button>
              <button onClick={async () => {
                const res = await publishCandidateAsSeed(c.id);
                if (res.success) { toast.success("Published as seed"); loadDashboard(); }
                else toast.error(res.error || "Publish failed");
              }} className="text-[10px] px-2 py-1 rounded-lg bg-primary/10 text-primary font-bold">Publish Seed</button>
              <button onClick={() => updateCandidateStatus(c.id, "ready_for_claim")} className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/10 text-blue-500">Ready Claim</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
