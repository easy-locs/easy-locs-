import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { fetchReferralCode, fetchReferrals as fetchReferralsList } from "@/repositories/rental.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { Gift, Copy, Users, CheckCircle2, Share2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { buildAppUrl } from "@/lib/app-domain";

const Referrals = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchReferralCode(user.id).then((code: string | null) => {
      if (code) setReferralCode(code);
    });
    fetchReferralsList(user.id).then((data) => {
      setReferrals(data);
      setLoading(false);
    });
  }, [user]);

  const referralLink = buildAppUrl(`/signup?ref=${referralCode}`);
  const converted = referrals.filter((r) => r.status === "converted").length;
  const pending = referrals.filter((r) => r.status === "pending").length;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: t("referral.copied") || "Link copied!" });
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Join me on Easy-Locs! ${referralLink}`)}`, "_blank");
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">{t("referral.title") || "Referral Program"}</h1>
        <p className="text-muted-foreground text-sm mb-8">{t("referral.subtitle") || "Invite landlords and earn 1 free month for each successful referral."}</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center">
            <Users className="h-6 w-6 text-accent mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{referrals.length}</div>
            <div className="text-xs text-muted-foreground">{t("referral.invited") || "Invited"}</div>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center">
            <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{converted}</div>
            <div className="text-xs text-muted-foreground">{t("referral.converted") || "Converted"}</div>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center">
            <Gift className="h-6 w-6 text-warning mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{converted}</div>
            <div className="text-xs text-muted-foreground">{t("referral.months_earned") || "Free months"}</div>
          </div>
        </div>

        {/* Referral link */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-accent" />
            {t("referral.your_link") || "Your referral link"}
          </h2>
          <div className="flex gap-2">
            <input type="text" readOnly value={referralLink}
              className="flex-1 bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground font-mono" />
            <button onClick={copyLink}
              className="flex items-center gap-2 bg-gradient-gold text-accent-foreground px-4 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity">
              <Copy className="h-4 w-4" /> {t("common.copy") || "Copy"}
            </button>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={shareWhatsApp}
              className="inline-flex items-center justify-center whitespace-nowrap h-10 px-4 rounded-xl text-sm font-semibold bg-success text-success-foreground hover:opacity-90 transition-opacity">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
            <button onClick={shareLinkedIn}
              className="inline-flex items-center justify-center whitespace-nowrap h-10 px-4 rounded-xl text-sm font-semibold bg-info text-info-foreground hover:opacity-90 transition-opacity">
              <Share2 className="h-4 w-4" /> LinkedIn
            </button>
          </div>
        </div>

        {/* Referral code */}
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 mb-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">{t("referral.your_code") || "Your referral code"}</p>
          <p className="text-3xl font-bold text-foreground tracking-wider">{referralCode}</p>
        </div>

        {/* History */}
        {referrals.length > 0 && (
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
            <h3 className="font-semibold text-foreground mb-4">{t("referral.history") || "Referral history"}</h3>
            <div className="space-y-3">
              {referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{r.referred_email || "—"}</span>
                  <span className={`inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium ${
                    r.status === "converted" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Referrals;
