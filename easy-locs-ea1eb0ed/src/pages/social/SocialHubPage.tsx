import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Gift, Award, Users, TrendingUp, Heart, ChevronRight, UserPlus, Rss } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useI18n } from "@/lib/i18n";
import SubPageShell from "@/components/layout/SubPageShell";
import { useFollowCounts } from "@/hooks/useSocialGraph";
import FollowingFeed from "@/components/social/FollowingFeed";
import FollowersList from "@/components/social/FollowersList";
import { useState } from "react";

const SECTIONS = [
  {
    id: "loyalty",
    title: "Loyalty & Rewards",
    description: "Earn points, unlock tiers, redeem rewards",
    icon: Star,
    color: "hsl(var(--accent))",
    bg: "hsl(var(--accent) / 0.1)",
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
  const { t } = useI18n();
  const { user } = useAuth();
  const { followers, following } = useFollowCounts(user?.id ?? "");
  const [activeTab, setActiveTab] = useState<"feed" | "network" | "sections">("feed");

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
          <h1 className="text-lg font-bold text-foreground">{t("social.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("social.hub")}</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-4 rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, hsl(270 60% 55% / 0.12), hsl(var(--accent) / 0.06))" }}
      >
        <div className="flex items-center gap-6">
          <div className="flex-1 text-center">
            <p className="text-2xl font-extrabold text-foreground">{followers}</p>
            <p className="text-[0.625rem] text-muted-foreground">{t("social.followers")}</p>
          </div>
          <div className="w-px h-8 bg-border/20" />
          <div className="flex-1 text-center">
            <p className="text-2xl font-extrabold text-foreground">{following}</p>
            <p className="text-[0.625rem] text-muted-foreground">{t("social.following")}</p>
          </div>
        </div>
      </motion.div>

      <div className="px-4 mb-4">
        <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
          {([
            { key: "feed", label: "Feed", icon: Rss },
            { key: "network", label: "Network", icon: UserPlus },
            { key: "sections", label: "Hub", icon: TrendingUp },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md transition-colors ${
                activeTab === key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-8">
        {activeTab === "feed" && <FollowingFeed />}

        {activeTab === "network" && user?.id && (
          <FollowersList userId={user.id} currentUserId={user.id} />
        )}

        {activeTab === "sections" && (
          <div className="space-y-3">
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
                    <p className="text-[0.6875rem] text-muted-foreground">{section.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
