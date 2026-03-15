import { Star, Briefcase, MessageSquare, Clock, CalendarDays, CheckCircle2, ShieldCheck, Reply } from "lucide-react";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";

interface TrustMetricsProps {
  rating?: number;
  reviewsCount?: number;
  verifiedReviewsCount?: number;
  completedJobs?: number;
  responseRate?: number;
  responseTime?: string;
  replyRate?: number;
  memberSince?: string;
  verifiedSince?: string;
  verified?: boolean;
  layout?: "horizontal" | "grid";
}

export default function TrustMetrics({
  rating = 0,
  reviewsCount = 0,
  verifiedReviewsCount,
  completedJobs = 0,
  responseRate = 0,
  responseTime,
  replyRate,
  memberSince,
  verifiedSince,
  verified,
  layout = "horizontal",
}: TrustMetricsProps) {
  const { t } = useI18n();
  const items: { icon: React.ReactNode; label: string; value: string; accent?: boolean }[] = [];

  if (rating > 0) {
    items.push({
      icon: <Star className="h-4 w-4 text-[hsl(var(--chart-4))] fill-[hsl(var(--chart-4))]" />,
      label: t("mp.trust_rating") || "Rating",
      value: `${rating.toFixed(1)}${reviewsCount > 0 ? ` (${reviewsCount})` : ""}`,
      accent: true,
    });
  }

  if (verifiedReviewsCount != null && verifiedReviewsCount > 0) {
    items.push({
      icon: <ShieldCheck className="h-4 w-4 text-success" />,
      label: t("mp.trust_verified_reviews") || "Verified reviews",
      value: `${verifiedReviewsCount}`,
    });
  }

  if (completedJobs > 0) {
    items.push({
      icon: <Briefcase className="h-4 w-4 text-accent/70" />,
      label: t("mp.trust_jobs_done") || "Jobs done",
      value: `${completedJobs}`,
    });
  }

  if (responseRate > 0) {
    items.push({
      icon: <MessageSquare className="h-4 w-4 text-accent/70" />,
      label: t("mp.trust_response") || "Response",
      value: `${responseRate}%`,
    });
  }

  if (replyRate != null && replyRate > 0) {
    items.push({
      icon: <Reply className="h-4 w-4 text-accent/70" />,
      label: t("mp.trust_reply_rate") || "Reply rate",
      value: `${replyRate}%`,
    });
  }

  if (responseTime) {
    items.push({
      icon: <Clock className="h-4 w-4 text-accent/70" />,
      label: t("mp.trust_responds_in") || "Responds in",
      value: responseTime,
    });
  }

  if (verified && verifiedSince) {
    items.push({
      icon: <CheckCircle2 className="h-4 w-4 text-accent" />,
      label: t("mp.trust_verified_since") || "Verified since",
      value: formatDate(verifiedSince),
    });
  }

  if (memberSince) {
    items.push({
      icon: <CalendarDays className="h-4 w-4 text-muted-foreground" />,
      label: t("mp.trust_member_since") || "Member since",
      value: formatDate(memberSince),
    });
  }

  if (items.length === 0) return null;

  if (layout === "grid") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1.5 p-3 bg-muted/30 rounded-xl border border-border/40 text-center"
          >
            {item.icon}
            <span className={`text-sm font-semibold ${item.accent ? "text-foreground" : "text-foreground"}`}>
              {item.value}
            </span>
            <span className="text-token-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5 text-muted-foreground">
          {item.icon}
          <span className={item.accent ? "font-medium text-foreground" : ""}>{item.value}</span>
        </span>
      ))}
    </div>
  );
}

function formatDate(d: string): string {
  try {
    return format(new Date(d), "MMM yyyy");
  } catch {
    return d;
  }
}
