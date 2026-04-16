import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Flame, Calendar, Trophy, CheckCircle2, Clock, Zap, Star, ChevronRight } from "lucide-react";
import SubPageShell from "@/components/layout/SubPageShell";
import { TIER_CONFIG } from "@/domains/loyalty/service";
import type { Challenge } from "@/domains/loyalty/ports";

type TabKey = "daily" | "weekly" | "milestones";

const DAILY: Challenge[] = [
  { id: "d1", type: "daily", title: "First Order Today", description: "Place any order to earn bonus points", icon: "shopping-bag", reward: 25, target: 1, current: 0, completed: false },
  { id: "d2", type: "daily", title: "Explorer", description: "Browse 5 different categories", icon: "compass", reward: 15, target: 5, current: 3, completed: false },
  { id: "d3", type: "daily", title: "Social Butterfly", description: "Share a listing or story", icon: "share-2", reward: 10, target: 1, current: 1, completed: true },
  { id: "d4", type: "daily", title: "Wallet Check-in", description: "Open your wallet and check balance", icon: "wallet", reward: 5, target: 1, current: 1, completed: true },
];

const WEEKLY: Challenge[] = [
  { id: "w1", type: "weekly", title: "Regular Customer", description: "Complete 5 orders this week", icon: "repeat", reward: 100, target: 5, current: 2, completed: false },
  { id: "w2", type: "weekly", title: "Traveler", description: "Book a travel service", icon: "plane", reward: 75, target: 1, current: 0, completed: false },
  { id: "w3", type: "weekly", title: "Ambassador", description: "Refer 2 friends who sign up", icon: "users", reward: 200, target: 2, current: 0, completed: false },
  { id: "w4", type: "weekly", title: "Wallet Pro", description: "Make 3 wallet transactions", icon: "credit-card", reward: 50, target: 3, current: 1, completed: false },
];

const MILESTONES: Challenge[] = [
  { id: "m1", type: "milestone", title: "Getting Started", description: "Earn 100 lifetime points", icon: "target", reward: 50, target: 100, current: 100, completed: true },
  { id: "m2", type: "milestone", title: "Silver Path", description: "Earn 500 lifetime points", icon: "target", reward: 100, target: 500, current: 350, completed: false },
  { id: "m3", type: "milestone", title: "Gold Rush", description: "Earn 2000 lifetime points", icon: "target", reward: 250, target: 2000, current: 350, completed: false },
  { id: "m4", type: "milestone", title: "Platinum Goal", description: "Earn 5000 lifetime points", icon: "target", reward: 500, target: 5000, current: 350, completed: false },
  { id: "m5", type: "milestone", title: "Diamond Dream", description: "Earn 15000 lifetime points", icon: "target", reward: 1000, target: 15000, current: 350, completed: false },
];

const TABS: { key: TabKey; label: string; icon: typeof Flame }[] = [
  { key: "daily", label: "Daily", icon: Flame },
  { key: "weekly", label: "Weekly", icon: Calendar },
  { key: "milestones", label: "Milestones", icon: Trophy },
];

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const progress = Math.min(100, (challenge.current / challenge.target) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 transition-all ${
        challenge.completed
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-border/15 bg-card/60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          challenge.completed ? "bg-emerald-500/15" : "bg-primary/10"
        }`}>
          {challenge.completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <Target className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-sm font-bold text-foreground">{challenge.title}</p>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-3 h-3 text-amber-500" />
              <span className="text-xs font-bold text-amber-500">+{challenge.reward}</span>
            </div>
          </div>
          <p className="text-[0.6875rem] text-muted-foreground mb-2">{challenge.description}</p>

          {!challenge.completed && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
              <span className="text-[0.625rem] font-bold text-muted-foreground shrink-0">
                {challenge.current}/{challenge.target}
              </span>
            </div>
          )}

          {challenge.completed && (
            <p className="text-[0.625rem] font-bold text-emerald-500">Completed</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function CustomerChallengesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("daily");

  const challenges = activeTab === "daily" ? DAILY : activeTab === "weekly" ? WEEKLY : MILESTONES;
  const completedCount = challenges.filter((c) => c.completed).length;
  const totalReward = challenges.reduce((s, c) => s + c.reward, 0);
  const earnedReward = challenges.filter((c) => c.completed).reduce((s, c) => s + c.reward, 0);

  return (
    <SubPageShell title="Challenges" subtitle="Complete challenges to earn bonus points" onBack={() => navigate("/me/loyalty-history")} noContentPad>

      <div className="mx-4 mb-4 rounded-2xl p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.625rem] uppercase font-bold text-muted-foreground tracking-wider">Today's Progress</p>
            <p className="text-2xl font-extrabold text-foreground">{completedCount}/{challenges.length}</p>
          </div>
          <div className="text-right">
            <p className="text-[0.625rem] uppercase font-bold text-muted-foreground tracking-wider">Earned</p>
            <p className="text-lg font-bold text-primary">{earnedReward}/{totalReward} pts</p>
          </div>
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-primary/10">
            <Zap className="w-7 h-7 text-primary" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 px-4 mb-4">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-2">
        <AnimatePresence mode="wait">
          {challenges.map((challenge, idx) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <ChallengeCard challenge={challenge} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="px-4 mt-6">
        <button
          onClick={() => navigate("/me/referral")}
          className="w-full rounded-2xl border border-border/15 bg-card/60 p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-foreground">Refer & Earn</p>
            <p className="text-[0.6875rem] text-muted-foreground">Invite friends, earn 200 pts each</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </SubPageShell>
  );
}
