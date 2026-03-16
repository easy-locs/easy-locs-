/**
 * CustomerExperienceHub — TTT. Customer Experience Hub.
 * NPS tracking, real-time feedback, proactive resolution, customer journey, satisfaction analytics.
 * PASS101-TTT
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Heart, Star, MessageCircle, TrendingUp, Users,
  ThumbsUp, ThumbsDown, Minus, BarChart3, Smile, Frown, Meh,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface FeedbackItem {
  id: string;
  customer: string;
  rating: number;
  npsScore: number;
  comment: string;
  category: string;
  sentiment: "positive" | "neutral" | "negative";
  resolved: boolean;
  date: Date;
}

const FEEDBACK: FeedbackItem[] = [
  { id: "f1", customer: "Awa N.", rating: 5, npsScore: 10, comment: "Livraison rapide et livreur très poli !", category: "Livraison", sentiment: "positive", resolved: true, date: new Date(Date.now() - 3600000) },
  { id: "f2", customer: "Mamadou S.", rating: 4, npsScore: 8, comment: "Bon service mais emballage moyen", category: "Colis", sentiment: "neutral", resolved: true, date: new Date(Date.now() - 7200000) },
  { id: "f3", customer: "Fatou D.", rating: 2, npsScore: 3, comment: "Retard de 30 min, aucune communication", category: "Ponctualité", sentiment: "negative", resolved: false, date: new Date(Date.now() - 14400000) },
  { id: "f4", customer: "Ibrahima K.", rating: 5, npsScore: 9, comment: "Excellent ! Je recommande", category: "Général", sentiment: "positive", resolved: true, date: new Date(Date.now() - 28800000) },
  { id: "f5", customer: "Aïcha M.", rating: 1, npsScore: 1, comment: "Colis endommagé à l'arrivée, très déçue", category: "Colis", sentiment: "negative", resolved: false, date: new Date(Date.now() - 43200000) },
  { id: "f6", customer: "Cheikh B.", rating: 4, npsScore: 7, comment: "Service correct, rien à signaler", category: "Général", sentiment: "neutral", resolved: true, date: new Date(Date.now() - 57600000) },
];

const JOURNEY_STEPS = [
  { step: "Commande", satisfaction: 92, volume: 450 },
  { step: "Confirmation", satisfaction: 88, volume: 445 },
  { step: "Retrait", satisfaction: 82, volume: 440 },
  { step: "En transit", satisfaction: 75, volume: 438 },
  { step: "Livraison", satisfaction: 85, volume: 430 },
  { step: "Post-livraison", satisfaction: 78, volume: 420 },
];

export default function CustomerExperienceHub({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"nps" | "feedback" | "journey" | "analytics">("nps");
  const [feedback, setFeedback] = useState(FEEDBACK);

  const promoters = feedback.filter(f => f.npsScore >= 9).length;
  const passives = feedback.filter(f => f.npsScore >= 7 && f.npsScore < 9).length;
  const detractors = feedback.filter(f => f.npsScore < 7).length;
  const nps = Math.round(((promoters - detractors) / feedback.length) * 100);
  const avgRating = (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1);
  const unresolved = feedback.filter(f => !f.resolved).length;
  const csat = Math.round(feedback.filter(f => f.rating >= 4).length / feedback.length * 100);

  const resolveIssue = (id: string) => {
    haptic("medium");
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, resolved: true } : f));
    toast.success("✅ Problème résolu proactivement");
  };

  const sentimentIcon = (s: string) => {
    if (s === "positive") return <Smile className="h-3.5 w-3.5" style={{ color: "hsl(var(--success))" }} />;
    if (s === "negative") return <Frown className="h-3.5 w-3.5" style={{ color: "hsl(var(--destructive))" }} />;
    return <Meh className="h-3.5 w-3.5" style={{ color: "hsl(var(--warning))" }} />;
  };

  const maxSat = Math.max(...JOURNEY_STEPS.map(j => j.satisfaction));

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Heart className="h-4 w-4" style={{ color: "hsl(var(--destructive))" }} />
          Expérience client
        </h3>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "NPS", value: nps > 0 ? `+${nps}` : nps, color: nps >= 50 ? "--success" : nps >= 0 ? "--warning" : "--destructive" },
          { label: "Note moy.", value: `⭐ ${avgRating}`, color: "--primary" },
          { label: "CSAT", value: `${csat}%`, color: csat >= 80 ? "--success" : "--warning" },
          { label: "Non résolu", value: unresolved, color: unresolved > 0 ? "--destructive" : "--success" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["nps", "feedback", "journey", "analytics"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "nps" ? "📊 NPS" : v === "feedback" ? "💬 Avis" : v === "journey" ? "🗺️ Parcours" : "📈 Stats"}
          </button>
        ))}
      </div>

      {view === "nps" && (
        <div className="space-y-3">
          <div className="rounded-xl p-4 text-center" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.15)" }}>
            <p className="text-3xl font-bold" style={{ color: nps >= 50 ? "hsl(var(--success))" : nps >= 0 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>
              {nps > 0 ? "+" : ""}{nps}
            </p>
            <p className="text-[10px] font-semibold mt-1" style={{ color: "hsl(var(--foreground))" }}>Net Promoter Score</p>
            <p className="text-[8px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
              {nps >= 70 ? "Excellent" : nps >= 50 ? "Très bon" : nps >= 0 ? "Correct" : "À améliorer"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Promoteurs", value: promoters, pct: Math.round(promoters / feedback.length * 100), color: "--success", range: "9-10" },
              { label: "Passifs", value: passives, pct: Math.round(passives / feedback.length * 100), color: "--warning", range: "7-8" },
              { label: "Détracteurs", value: detractors, pct: Math.round(detractors / feedback.length * 100), color: "--destructive", range: "0-6" },
            ].map(g => (
              <div key={g.label} className="rounded-xl p-3 text-center"
                style={{ background: `hsl(var(${g.color}) / 0.05)`, border: `1px solid hsl(var(${g.color}) / 0.1)` }}>
                <p className="text-lg font-bold" style={{ color: `hsl(var(${g.color}))` }}>{g.pct}%</p>
                <p className="text-[9px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{g.label}</p>
                <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{g.value} ({g.range})</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "feedback" && (
        <div className="space-y-2">
          {feedback.map(f => (
            <div key={f.id} className="rounded-xl p-3"
              style={{
                background: !f.resolved && f.sentiment === "negative" ? "hsl(var(--destructive) / 0.03)" : "hsl(var(--muted) / 0.2)",
                border: `1px solid ${!f.resolved && f.sentiment === "negative" ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--border) / 0.08)"}`,
              }}>
              <div className="flex items-start gap-2">
                {sentimentIcon(f.sentiment)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{f.customer}</p>
                    <span className="text-[8px]" style={{ color: "hsl(var(--warning))" }}>
                      {"⭐".repeat(f.rating)}
                    </span>
                  </div>
                  <p className="text-[9px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>"{f.comment}"</p>
                  <p className="text-[8px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                    📂 {f.category} • NPS: {f.npsScore}/10
                  </p>
                </div>
                {!f.resolved && f.sentiment === "negative" && (
                  <Button size="sm" className="text-[8px] h-6 px-2 shrink-0" onClick={() => resolveIssue(f.id)}
                    style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                    Résoudre
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "journey" && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>Parcours client — Satisfaction</p>
          {JOURNEY_STEPS.map((j, i) => (
            <div key={j.step} className="flex items-center gap-2">
              <span className="text-[9px] w-20 font-medium" style={{ color: "hsl(var(--foreground))" }}>{j.step}</span>
              <div className="flex-1 h-5 rounded-lg overflow-hidden relative" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${j.satisfaction}%` }}
                  className="h-full rounded-lg" style={{
                    background: j.satisfaction >= 85 ? "hsl(var(--success) / 0.6)" : j.satisfaction >= 75 ? "hsl(var(--warning) / 0.6)" : "hsl(var(--destructive) / 0.6)",
                  }} />
                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold" style={{ color: "hsl(var(--foreground))" }}>
                  {j.satisfaction}%
                </span>
              </div>
              <span className="text-[7px] w-8 text-right" style={{ color: "hsl(var(--muted-foreground))" }}>{j.volume}</span>
            </div>
          ))}
          <p className="text-[8px] text-center mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            ⚠️ Point faible : "En transit" — améliorer la communication temps réel
          </p>
        </div>
      )}

      {view === "analytics" && (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>Répartition sentiments</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Positif", count: feedback.filter(f => f.sentiment === "positive").length, color: "--success", icon: "😊" },
              { label: "Neutre", count: feedback.filter(f => f.sentiment === "neutral").length, color: "--warning", icon: "😐" },
              { label: "Négatif", count: feedback.filter(f => f.sentiment === "negative").length, color: "--destructive", icon: "😞" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center"
                style={{ background: `hsl(var(${s.color}) / 0.05)`, border: `1px solid hsl(var(${s.color}) / 0.1)` }}>
                <span className="text-xl">{s.icon}</span>
                <p className="text-lg font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.count}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-semibold mt-2" style={{ color: "hsl(var(--foreground))" }}>Top catégories problèmes</p>
          {[...new Set(feedback.filter(f => f.sentiment === "negative").map(f => f.category))].map(cat => {
            const count = feedback.filter(f => f.category === cat && f.sentiment === "negative").length;
            return (
              <div key={cat} className="flex items-center gap-2 py-1">
                <span className="text-[9px] font-medium flex-1" style={{ color: "hsl(var(--foreground))" }}>{cat}</span>
                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(count / feedback.length) * 100}%`, background: "hsl(var(--destructive))" }} />
                </div>
                <span className="text-[9px] font-bold" style={{ color: "hsl(var(--destructive))" }}>{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
