import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Copy, Share2, Users, Gift, Star } from "lucide-react";
import { toast } from "sonner";
import SubPageShell from "@/components/layout/SubPageShell";

export default function CustomerReferralPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const referralCode = `MONDI-${(user?.id ?? "USER").slice(0, 4).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const referralLink = `https://mondikat.com/join/${referralCode}`;

  const handleCopy = async () => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(referralLink);
        toast.success("Link copied!");
      } catch {
        toast.error("Could not copy");
      }
    } else {
      toast.error("Could not copy");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Mondikat",
          text: `Join me on Mondikat and get 200 bonus points! Use my code: ${referralCode}`,
          url: referralLink,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const stats = [
    { label: "Friends Invited", value: "0", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Pending", value: "0", icon: Gift, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Points Earned", value: "0", icon: Star, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  const steps = [
    { step: 1, title: "Share your link", description: "Send your unique referral link to friends" },
    { step: 2, title: "Friend signs up", description: "They create an account using your link" },
    { step: 3, title: "Both earn rewards", description: "You both get 200 bonus points!" },
  ];

  return (
    <SubPageShell title="Refer & Earn" subtitle="Invite friends, earn together" onBack={() => navigate(-1)} noContentPad>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-4 rounded-2xl p-5 text-center"
        style={{ background: "linear-gradient(135deg, hsl(270 60% 55% / 0.12), hsl(200 80% 60% / 0.08))" }}
      >
        <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center bg-primary/10">
          <Gift className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-extrabold text-foreground mb-1">Give 200, Get 200</h2>
        <p className="text-xs text-muted-foreground">Invite a friend and you both earn 200 bonus points</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mx-4 mb-4 rounded-2xl border border-border/15 bg-card/60 p-4"
      >
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Your Referral Code</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl bg-muted/30 px-4 py-3 font-mono text-sm font-bold text-foreground tracking-wider">
            {referralCode}
          </div>
          <button
            onClick={handleCopy}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 active:scale-95 transition-transform"
          >
            <Copy className="w-4 h-4 text-primary" />
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-muted/30 text-xs font-bold text-foreground active:scale-[0.98] transition-transform"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Link
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-[0.98] transition-transform"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </motion.div>

      <div className="mx-4 mb-4 grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-border/10 bg-card/40 p-3 text-center"
          >
            <div className={`w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center ${stat.bg}`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[9px] text-muted-foreground font-semibold uppercase">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="px-4 mb-4">
        <h3 className="text-xs font-bold text-foreground mb-3">How it works</h3>
        <div className="space-y-3">
          {steps.map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-xs font-bold text-primary">
                {s.step}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{s.title}</p>
                <p className="text-[11px] text-muted-foreground">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SubPageShell>
  );
}
