import { useState, useMemo } from "react";
import { validateEntityMenuCoherence, type CoherenceResult } from "@/lib/engines/coherence-engine";
import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, CheckCircle } from "lucide-react";

// Demo data for testing coherence engine
const DEMO_ENTITIES = [
  {
    label: "Sushi Bay (correct menu)",
    entity: { name: "Sushi Bay", vertical: "food", subcategory: "sushi" },
    menu: [
      { name: "California Roll", category: "sushi" },
      { name: "Salmon Nigiri", category: "sushi" },
      { name: "Miso Soup", description: "traditional miso", category: "starters" },
      { name: "Green Tea", category: "drinks" },
    ],
  },
  {
    label: "Sushi Bay (WRONG pizza menu)",
    entity: { name: "Sushi Bay", vertical: "food", subcategory: "sushi" },
    menu: [
      { name: "Margherita", description: "Tomato, mozzarella, basil", category: "pizza" },
      { name: "Pepperoni", description: "Pepperoni pizza", category: "pizza" },
      { name: "BBQ Chicken Pizza", category: "pizza" },
      { name: "Garlic Bread", category: "sides" },
    ],
  },
  {
    label: "Pizza Palace (correct menu)",
    entity: { name: "Pizza Palace", vertical: "food", subcategory: "pizza" },
    menu: [
      { name: "Margherita", description: "Classic tomato and mozzarella", category: "pizza" },
      { name: "Pepperoni", description: "Spicy pepperoni pizza", category: "pizza" },
      { name: "Pasta Carbonara", category: "pasta" },
      { name: "Coke", category: "drinks" },
    ],
  },
  {
    label: "Fresh Pharmacy (WRONG food menu)",
    entity: { name: "Fresh Pharmacy", vertical: "pharmacy", subcategory: "pharmacy" },
    menu: [
      { name: "Chicken Burger", category: "burgers" },
      { name: "Fries", category: "sides" },
      { name: "Coke", category: "drinks" },
    ],
  },
];

function getStatusIcon(status: CoherenceResult["status"]) {
  switch (status) {
    case "premium_confident": return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    case "publishable": return <ShieldCheck className="w-5 h-5 text-blue-500" />;
    case "review_required": return <ShieldAlert className="w-5 h-5 text-amber-500" />;
    case "blocked": return <ShieldX className="w-5 h-5 text-destructive" />;
  }
}

function getStatusBg(status: CoherenceResult["status"]) {
  switch (status) {
    case "premium_confident": return "bg-emerald-500/10 border-emerald-500/20";
    case "publishable": return "bg-blue-500/10 border-blue-500/20";
    case "review_required": return "bg-amber-500/10 border-amber-500/20";
    case "blocked": return "bg-destructive/10 border-destructive/20";
  }
}

export default function AdminCoherenceControlPage() {
  const [results, setResults] = useState<Array<{ label: string; result: CoherenceResult }>>([]);

  const runAudit = () => {
    const res = DEMO_ENTITIES.map(d => ({
      label: d.label,
      result: validateEntityMenuCoherence({
        entity_name: d.entity.name,
        entity_vertical: d.entity.vertical,
        entity_subcategory: d.entity.subcategory,
        menu_items: d.menu,
      }),
    }));
    setResults(res);
  };

  const stats = useMemo(() => {
    if (!results.length) return null;
    return {
      total: results.length,
      blocked: results.filter(r => r.result.status === "blocked").length,
      review: results.filter(r => r.result.status === "review_required").length,
      ok: results.filter(r => r.result.status === "publishable" || r.result.status === "premium_confident").length,
      avgScore: Math.round(results.reduce((s, r) => s + r.result.entity_menu_match_score, 0) / results.length),
    };
  }, [results]);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg font-bold">Entity-Menu Coherence Control</h1>
          <p className="text-xs text-muted-foreground">Detect and block cross-vertical menu contamination</p>
        </div>
      </div>

      <button
        onClick={runAudit}
        className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold text-sm"
      >
        Run Coherence Audit
      </button>

      {stats && (
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Blocked" value={stats.blocked} color="text-destructive" />
          <StatCard label="Review" value={stats.review} color="text-amber-500" />
          <StatCard label="OK" value={stats.ok} color="text-emerald-500" />
        </div>
      )}

      <div className="space-y-3">
        {results.map((r, i) => (
          <div key={i} className={`rounded-xl border p-4 space-y-3 ${getStatusBg(r.result.status)}`}>
            <div className="flex items-start gap-3">
              {getStatusIcon(r.result.status)}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{r.label}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono font-bold">
                    Score: {r.result.entity_menu_match_score}/100
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    r.result.status === "blocked" ? "bg-destructive/20 text-destructive" :
                    r.result.status === "review_required" ? "bg-amber-500/20 text-amber-600" :
                    r.result.status === "premium_confident" ? "bg-emerald-500/20 text-emerald-600" :
                    "bg-blue-500/20 text-blue-600"
                  }`}>
                    {r.result.status.toUpperCase().replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <SubScore label="Vertical" value={r.result.vertical_match_score} />
              <SubScore label="Subcategory" value={r.result.subcategory_match_score} />
              <SubScore label="Keywords" value={r.result.keyword_match_score} />
              <SubScore label="Taxonomy" value={r.result.taxonomy_match_score} />
              <SubScore label="Title" value={r.result.title_match_score} />
            </div>

            {r.result.conflicts.length > 0 && (
              <div className="space-y-1">
                {r.result.conflicts.map((c, ci) => (
                  <div key={ci} className="flex items-start gap-1.5 text-[11px] text-destructive">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl bg-card border border-border/30 p-3 text-center">
      <div className={`text-xl font-bold ${color ?? "text-foreground"}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function SubScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className={`font-bold ${value >= 75 ? "text-emerald-500" : value >= 50 ? "text-amber-500" : "text-destructive"}`}>
        {value}
      </div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}
