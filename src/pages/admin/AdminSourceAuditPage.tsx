import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getTrustedSources } from "@/lib/source/source-priority-engine";

const VERTICALS = ["food", "grocery", "property", "services", "healthcare", "shops", "mobility", "experiences"];

interface SourceStat {
  source_type: string;
  count: number;
  avg_confidence: number;
  claimed: number;
  unclaimed: number;
}

export default function AdminSourceAuditPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SourceStat[]>([]);
  const [selectedVertical, setSelectedVertical] = useState("food");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("source_type, source_confidence, is_claimed");

      if (!data?.length) { setStats([]); return; }

      const groups: Record<string, { count: number; totalConf: number; claimed: number; unclaimed: number }> = {};
      for (const row of data) {
        const st = row.source_type || "unknown";
        if (!groups[st]) groups[st] = { count: 0, totalConf: 0, claimed: 0, unclaimed: 0 };
        groups[st].count++;
        groups[st].totalConf += row.source_confidence || 0;
        if (row.is_claimed) groups[st].claimed++; else groups[st].unclaimed++;
      }

      setStats(
        Object.entries(groups)
          .map(([source_type, g]) => ({
            source_type,
            count: g.count,
            avg_confidence: g.count ? Math.round(g.totalConf / g.count) : 0,
            claimed: g.claimed,
            unclaimed: g.unclaimed,
          }))
          .sort((a, b) => b.count - a.count)
      );
    } finally {
      setLoading(false);
    }
  }

  const trustedSources = getTrustedSources(selectedVertical);
  const totalEntities = stats.reduce((s, r) => s + r.count, 0);
  const totalClaimed = stats.reduce((s, r) => s + r.claimed, 0);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-sm">←</button>
        <div>
          <h1 className="text-lg font-bold">Source Audit</h1>
          <p className="text-xs text-muted-foreground">Data source quality & trust</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Entities", value: totalEntities },
          { label: "Claimed", value: totalClaimed },
          { label: "Sources", value: stats.length },
        ].map(s => (
          <div key={s.label} className="rounded-2xl bg-card border border-border/20 p-3 text-center">
            <div className="text-lg font-bold">{loading ? "…" : s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Source Distribution */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold">Source Distribution</h2>
        {stats.map(s => (
          <div key={s.source_type} className="rounded-2xl bg-card border border-border/20 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{s.source_type}</div>
              <div className="text-xs text-muted-foreground">{s.count} entities</div>
            </div>
            <div className="flex gap-3 mt-2">
              <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                s.avg_confidence >= 80 ? "bg-emerald-500/10 text-emerald-500" :
                s.avg_confidence >= 50 ? "bg-amber-500/10 text-amber-500" :
                "bg-destructive/10 text-destructive"
              }`}>
                Confidence: {s.avg_confidence}
              </div>
              <div className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {s.claimed} claimed
              </div>
              <div className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">
                {s.unclaimed} unclaimed
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Trusted Sources by Vertical */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold">Trusted Sources by Vertical</h2>
        <div className="flex gap-2 flex-wrap">
          {VERTICALS.map(v => (
            <button
              key={v}
              onClick={() => setSelectedVertical(v)}
              className={`text-[11px] px-3 py-1.5 rounded-full font-bold transition-colors ${
                selectedVertical === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          {trustedSources.map(s => (
            <div key={s.key} className="flex items-center justify-between rounded-xl bg-card border border-border/20 px-3 py-2">
              <div className="text-xs font-semibold">{s.label}</div>
              <div className="flex items-center gap-2">
                <div className="text-[10px] text-muted-foreground">parser: {s.parser}</div>
                <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  s.confidence >= 90 ? "bg-emerald-500/10 text-emerald-500" :
                  s.confidence >= 70 ? "bg-amber-500/10 text-amber-500" :
                  "bg-destructive/10 text-destructive"
                }`}>
                  {s.confidence}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline Rules */}
      <div className="rounded-2xl bg-card border border-border/20 p-4 space-y-2">
        <h2 className="text-sm font-bold">Pipeline Rules</h2>
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <div>✅ Source confidence &lt; 50 → <span className="text-destructive font-bold">auto reject</span></div>
          <div>✅ Menu coherence &lt; 50 → <span className="text-destructive font-bold">quarantine</span></div>
          <div>✅ Cross-vertical contamination → <span className="text-destructive font-bold">blocked</span></div>
          <div>✅ Duplicate items → <span className="text-amber-500 font-bold">auto-cleaned</span></div>
          <div>✅ Invalid prices → <span className="text-amber-500 font-bold">auto-removed</span></div>
          <div>✅ Merchant override → <span className="text-primary font-bold">always respected</span></div>
        </div>
      </div>
    </div>
  );
}
