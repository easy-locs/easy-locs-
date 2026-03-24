import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { runUxAudit, type UxAuditReport } from "@/lib/engines/ux-audit-engine";
import { auditMenu, type MenuAuditResult } from "@/lib/engines/menu-presentation-engine";
import { runVisualConsistencyAudit, type ConsistencyReport } from "@/lib/engines/visual-consistency-engine";

function ScoreRing({ score, label, size = 56 }: { score: number; label: string; size?: number }) {
  const color = score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-destructive";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${color} font-bold`} style={{ fontSize: size * 0.4 }}>{score}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cls = severity === "critical" ? "bg-destructive/10 text-destructive"
    : severity === "high" ? "bg-amber-500/10 text-amber-600"
    : severity === "medium" ? "bg-yellow-500/10 text-yellow-600"
    : "bg-muted text-muted-foreground";
  return <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${cls}`}>{severity}</span>;
}

export default function AdminVisualQualityPage() {
  const navigate = useNavigate();
  const [uxReport, setUxReport] = useState<UxAuditReport | null>(null);
  const [consistencyReport, setConsistencyReport] = useState<ConsistencyReport | null>(null);
  const [menuResults, setMenuResults] = useState<MenuAuditResult[]>([]);
  const [running, setRunning] = useState(false);

  const runFullAudit = useCallback(() => {
    setRunning(true);
    try {
      // UX Audit on current page
      const ux = runUxAudit();
      setUxReport(ux);

      // Visual Consistency
      const vc = runVisualConsistencyAudit();
      setConsistencyReport(vc);

      // Menu audit — demo with mock data structure
      const demoMenus = [
        {
          id: "demo-1", name: "Al Mallah Restaurant", cover_image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",
          menu_categories: [
            { name: "Shawarma", items: [{ name: "Chicken Shawarma", price: 12, description: "Classic wrap", image_url: "https://img.com/1" }] },
            { name: "Grills", items: [{ name: "Mixed Grill", price: 45, description: "Platter" }] },
            { name: "Drinks", items: [{ name: "Fresh Juice", price: 8 }] },
          ],
        },
        {
          id: "demo-2", name: "Ravi Restaurant",
          menu_categories: [
            { name: "Curry", items: [{ name: "Chicken Curry", price: 18 }, { name: "Dal", price: 10 }] },
          ],
        },
      ];
      setMenuResults(demoMenus.map((m) => auditMenu(m)));
    } finally {
      setRunning(false);
    }
  }, []);

  const globalUx = uxReport?.globalScore ?? 0;
  const globalConsistency = consistencyReport?.score.total ?? 0;
  const globalMenu = menuResults.length > 0 ? Math.round(menuResults.reduce((s, m) => s + m.score.total, 0) / menuResults.length) : 0;
  const globalAll = uxReport ? Math.round((globalUx + globalConsistency + globalMenu) / 3) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 space-y-5 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-sm">←</button>
        <div>
          <h1 className="text-lg font-bold">Visual Quality Dashboard</h1>
          <p className="text-xs text-muted-foreground">UX · Menu · Consistency engines</p>
        </div>
      </div>

      {/* Global Score */}
      {uxReport && (
        <div className="rounded-2xl border border-border bg-card p-5 text-center space-y-3">
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Global Quality Score</div>
          <div className={`text-4xl font-bold ${globalAll >= 80 ? "text-emerald-500" : globalAll >= 60 ? "text-amber-500" : "text-destructive"}`}>{globalAll}</div>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <ScoreRing score={globalUx} label="UX/UI" />
            <ScoreRing score={globalConsistency} label="Consistency" />
            <ScoreRing score={globalMenu} label="Menu" />
          </div>
        </div>
      )}

      {/* Run Button */}
      <button
        onClick={runFullAudit}
        disabled={running}
        className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3.5 text-sm font-bold disabled:opacity-50"
      >
        {running ? "Scanning..." : "🔍 Run Full Visual Audit"}
      </button>

      {/* UX Report */}
      {uxReport && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold">UX/UI Audit</h2>
            <span className="text-xs text-muted-foreground">{uxReport.totalIssues} issues · {uxReport.totalFixed} fixed</span>
          </div>
          {uxReport.pages.map((p) => (
            <div key={p.page} className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-semibold">{p.page}</span>
                <span className={`text-xs font-bold ${p.score >= 80 ? "text-emerald-500" : p.score >= 60 ? "text-amber-500" : "text-destructive"}`}>{p.score}/100</span>
              </div>
              {p.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <SeverityBadge severity={issue.severity} />
                  <span className={issue.fixed ? "line-through text-muted-foreground" : "text-foreground"}>{issue.description}</span>
                  {issue.fixed && <span className="text-emerald-500 text-[9px]">✓ fixed</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Consistency Report */}
      {consistencyReport && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-bold">Visual Consistency</h2>
          <div className="grid grid-cols-4 gap-2">
            <ScoreRing score={consistencyReport.score.cardConsistency} label="Cards" size={40} />
            <ScoreRing score={consistencyReport.score.ctaConsistency} label="CTAs" size={40} />
            <ScoreRing score={consistencyReport.score.spacingConsistency} label="Spacing" size={40} />
            <ScoreRing score={consistencyReport.score.colorConsistency} label="Colors" size={40} />
          </div>
          {consistencyReport.issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <SeverityBadge severity={issue.severity} />
              <span>{issue.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Menu Quality */}
      {menuResults.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-bold">Menu Quality</h2>
          {menuResults.map((m) => (
            <div key={m.entityId} className="rounded-xl border border-border/50 p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold">{m.entityName}</span>
                <span className={`text-xs font-bold ${m.score.total >= 70 ? "text-emerald-500" : m.score.total >= 50 ? "text-amber-500" : "text-destructive"}`}>{m.score.total}/100</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                <div className="text-center"><div className="font-bold">{m.score.structure}</div><div className="text-muted-foreground">Structure</div></div>
                <div className="text-center"><div className="font-bold">{m.score.completeness}</div><div className="text-muted-foreground">Complete</div></div>
                <div className="text-center"><div className="font-bold">{m.score.conversion}</div><div className="text-muted-foreground">Convert</div></div>
                <div className="text-center"><div className="font-bold">{m.score.visual}</div><div className="text-muted-foreground">Visual</div></div>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {m.categoryCount} cats · {m.itemCount} items · {m.issues.length} issues
              </div>
              {m.issues.slice(0, 5).map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px]">
                  <SeverityBadge severity={issue.severity} />
                  <span>{issue.description}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
