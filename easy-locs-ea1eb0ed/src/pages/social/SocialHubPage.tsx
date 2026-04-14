import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Gift, Award, Users, TrendingUp, Heart, ChevronRight } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const SECTIONS = [
  {
    id: "loyalty",
    title: "Loyalty & Rewards",
    description: "Earn points, unlock tiers, redeem rewards",
    icon: Star,
    color: "hsl(38 65% 56%)",
    bg: "hsl(38 65% 56% / 0.1)",
    route: "/me/loyalty",
  },
  {
    id: "referrals",
    title: "Refer & Earn",
    description: "Invite friends, both earn bonuses",
    icon: Users,
    color: "hsl(200 80% 60%)",
    bg: "hsl(200 80% 60% / 0.1)",
    route: "/me/referrals",
  },
  {
    id: "badges",
    title: "Badges & Achievements",
    description: "Unlock milestones, showcase progress",
    icon: Award,
    color: "hsl(270 60% 55%)",
    bg: "hsl(270 60% 55% / 0.1)",
    route: "/me/badges",
  },
  {
    id: "reviews",
    title: "My Reviews",
    description: "Your ratings and feedback history",
    icon: Heart,
    color: "hsl(350 70% 55%)",
    bg: "hsl(350 70% 55% / 0.1)",
    route: "/me/reviews",
  },
];

export default function SocialHubPage() {
  useUiEngine("social-hub");
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <SubPageShell className="bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/me")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted/60"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Social & Engagement</h1>
          <p className="text-xs text-muted-foreground">Rewards, referrals, and achievements</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-6 rounded-2xl p-5 text-center"
        style={{ background: "linear-gradient(135deg, hsl(270 60% 55% / 0.12), hsl(38 65% 56% / 0.08))" }}
      >
        <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center bg-primary/10">
          <TrendingUp className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-lg font-extrabold text-foreground mb-1">Your Engagement Hub</h2>
        <p className="text-xs text-muted-foreground">Track rewards, earn badges, grow your network</p>
      </motion.div>

      <div className="px-4 space-y-3">
        {SECTIONS.map((section, idx) => {
          const Icon = section.icon;
          return (
            <motion.button
              key={section.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              onClick={() => navigate(section.route)}
              className="w-full rounded-2xl border border-border/15 bg-card/60 p-4 flex items-center gap-4 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: section.bg }}>
                <Icon className="w-5 h-5" style={{ color: section.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{section.title}</p>
                <p className="text-[11px] text-muted-foreground">{section.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </SubPageShell>
  );
}
