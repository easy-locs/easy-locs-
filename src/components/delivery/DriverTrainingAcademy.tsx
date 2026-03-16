/**
 * DriverTrainingAcademy — EEE2. Driver Training Academy.
 * E-learning modules, gamified certifications, practical evaluations, career progression paths.
 * PASS104-EEE2
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, BookOpen, Trophy, Star, CheckCircle2,
  Clock, Target, Award, TrendingUp, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Course {
  id: string;
  title: string;
  category: string;
  duration: number;
  modules: number;
  completedModules: number;
  level: "beginner" | "intermediate" | "advanced";
  mandatory: boolean;
  xpReward: number;
  badge: string;
}

interface Certification {
  id: string;
  name: string;
  driverName: string;
  earnedAt: Date;
  expiresAt: Date;
  score: number;
  badge: string;
  status: "active" | "expiring" | "expired";
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  completedCourses: number;
  badges: string[];
  level: string;
}

const COURSES: Course[] = [
  { id: "c1", title: "Sécurité routière urbaine", category: "Sécurité", duration: 45, modules: 6, completedModules: 6, level: "beginner", mandatory: true, xpReward: 200, badge: "🛡️" },
  { id: "c2", title: "Gestion client & communication", category: "Service", duration: 30, modules: 4, completedModules: 3, level: "beginner", mandatory: true, xpReward: 150, badge: "💬" },
  { id: "c3", title: "Navigation GPS avancée", category: "Technique", duration: 60, modules: 8, completedModules: 5, level: "intermediate", mandatory: false, xpReward: 300, badge: "🗺️" },
  { id: "c4", title: "Conduite véhicule électrique", category: "Technique", duration: 90, modules: 10, completedModules: 0, level: "advanced", mandatory: false, xpReward: 500, badge: "⚡" },
  { id: "c5", title: "Manipulation colis fragiles", category: "Logistique", duration: 25, modules: 3, completedModules: 3, level: "beginner", mandatory: true, xpReward: 100, badge: "📦" },
  { id: "c6", title: "Premiers secours", category: "Sécurité", duration: 120, modules: 12, completedModules: 8, level: "advanced", mandatory: false, xpReward: 600, badge: "🏥" },
];

const CERTIFICATIONS: Certification[] = [
  { id: "cert1", name: "Livreur Certifié Niveau 1", driverName: "Ousmane B.", earnedAt: new Date(Date.now() - 2592000000), expiresAt: new Date(Date.now() + 23328000000), score: 94, badge: "🥇", status: "active" },
  { id: "cert2", name: "Expert Sécurité Routière", driverName: "Ibrahima S.", earnedAt: new Date(Date.now() - 5184000000), expiresAt: new Date(Date.now() + 20736000000), score: 88, badge: "🛡️", status: "active" },
  { id: "cert3", name: "Spécialiste EV", driverName: "Aïcha M.", earnedAt: new Date(Date.now() - 7776000000), expiresAt: new Date(Date.now() + 1209600000), score: 91, badge: "⚡", status: "expiring" },
  { id: "cert4", name: "Livreur Certifié Niveau 1", driverName: "Modou D.", earnedAt: new Date(Date.now() - 31536000000), expiresAt: new Date(Date.now() - 604800000), score: 76, badge: "🥇", status: "expired" },
];

const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: "Ousmane B.", xp: 2450, completedCourses: 12, badges: ["🥇", "🛡️", "📦", "💬"], level: "Expert" },
  { rank: 2, name: "Aïcha M.", xp: 2100, completedCourses: 10, badges: ["⚡", "🗺️", "🛡️"], level: "Avancé" },
  { rank: 3, name: "Ibrahima S.", xp: 1800, completedCourses: 8, badges: ["🛡️", "💬"], level: "Intermédiaire" },
  { rank: 4, name: "Modou D.", xp: 1200, completedCourses: 5, badges: ["📦"], level: "Débutant" },
  { rank: 5, name: "Fatou N.", xp: 950, completedCourses: 4, badges: ["💬"], level: "Débutant" },
];

export default function DriverTrainingAcademy({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"courses" | "certifications" | "leaderboard">("courses");

  const totalCourses = COURSES.length;
  const completed = COURSES.filter(c => c.completedModules === c.modules).length;
  const totalXP = COURSES.filter(c => c.completedModules === c.modules).reduce((s, c) => s + c.xpReward, 0);
  const activeCerts = CERTIFICATIONS.filter(c => c.status === "active").length;

  const levelCfg = (l: string) => ({
    beginner: { label: "Débutant", color: "--success" },
    intermediate: { label: "Intermédiaire", color: "--warning" },
    advanced: { label: "Avancé", color: "--destructive" },
  }[l] || { label: l, color: "--muted-foreground" });

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <GraduationCap className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
        Académie de formation
      </h3>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Cours", value: `${completed}/${totalCourses}`, color: "--primary" },
          { label: "XP gagné", value: totalXP, color: "--warning" },
          { label: "Certif. actives", value: activeCerts, color: "--success" },
          { label: "Classement", value: `#${LEADERBOARD[0]?.rank || "-"}`, color: "--info" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["courses", "certifications", "leaderboard"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "courses" ? "📚 Cours" : v === "certifications" ? "🏅 Certifications" : "🏆 Classement"}
          </button>
        ))}
      </div>

      {view === "courses" && (
        <div className="space-y-2">
          {COURSES.map(c => {
            const pct = Math.round((c.completedModules / c.modules) * 100);
            const lvl = levelCfg(c.level);
            const done = c.completedModules === c.modules;
            return (
              <div key={c.id} className="rounded-xl p-3"
                style={{ background: done ? "hsl(var(--success) / 0.03)" : "hsl(var(--muted) / 0.2)", border: `1px solid ${done ? "hsl(var(--success) / 0.15)" : "hsl(var(--border) / 0.08)"}` }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{c.badge}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{c.title}</p>
                      {c.mandatory && <span className="text-[6px] font-bold px-1 py-0.5 rounded" style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))" }}>Obligatoire</span>}
                    </div>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      📂 {c.category} • ⏱️ {c.duration}min • {c.completedModules}/{c.modules} modules • 🎯 {c.xpReward} XP
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4" style={{ color: "hsl(var(--success))" }} />
                    ) : (
                      <p className="text-[10px] font-bold" style={{ color: `hsl(var(${lvl.color}))` }}>{pct}%</p>
                    )}
                  </div>
                </div>
                <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    className="h-full rounded-full" style={{ background: done ? "hsl(var(--success))" : "hsl(var(--primary))" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "certifications" && (
        <div className="space-y-2">
          {CERTIFICATIONS.map(c => {
            const statusColor = c.status === "active" ? "--success" : c.status === "expiring" ? "--warning" : "--destructive";
            const statusLabel = c.status === "active" ? "Actif" : c.status === "expiring" ? "Expire bientôt" : "Expiré";
            return (
              <div key={c.id} className="rounded-xl p-3"
                style={{ background: c.status === "expired" ? "hsl(var(--destructive) / 0.03)" : "hsl(var(--muted) / 0.2)", border: `1px solid ${c.status === "expired" ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--border) / 0.08)"}` }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{c.badge}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{c.name}</p>
                      <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `hsl(var(${statusColor}) / 0.1)`, color: `hsl(var(${statusColor}))` }}>{statusLabel}</span>
                    </div>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      👤 {c.driverName} • 📅 Expire: {c.expiresAt.toLocaleDateString("fr")}
                    </p>
                  </div>
                  <p className="text-[11px] font-bold shrink-0" style={{ color: c.score >= 90 ? "hsl(var(--success))" : "hsl(var(--warning))" }}>
                    {c.score}/100
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "leaderboard" && (
        <div className="space-y-2">
          {LEADERBOARD.map(l => (
            <div key={l.rank} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: l.rank <= 3 ? "hsl(var(--warning) / 0.03)" : "hsl(var(--muted) / 0.2)", border: `1px solid ${l.rank <= 3 ? "hsl(var(--warning) / 0.12)" : "hsl(var(--border) / 0.08)"}` }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px]"
                style={{ background: l.rank === 1 ? "hsl(var(--warning) / 0.15)" : "hsl(var(--muted) / 0.5)", color: l.rank === 1 ? "hsl(var(--warning))" : "hsl(var(--muted-foreground))" }}>
                {l.rank <= 3 ? ["🥇", "🥈", "🥉"][l.rank - 1] : `#${l.rank}`}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{l.name}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  📚 {l.completedCourses} cours • 🎖️ {l.badges.join(" ")} • 📊 {l.level}
                </p>
              </div>
              <p className="text-[11px] font-bold shrink-0" style={{ color: "hsl(var(--warning))" }}>
                {l.xp.toLocaleString()} XP
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
