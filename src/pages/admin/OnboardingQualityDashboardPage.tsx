import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboardingQualityDashboard } from "@/hooks/useOnboardingQualityDashboard";
import { useOnboardingReviewQueue } from "@/hooks/useOnboardingReviewQueue";
import { approveReviewQueueItem, rejectReviewQueueItem, markNeedsRecrawl } from "@/lib/onboarding/review-actions.service";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, Eye, Shield, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function StatCard({ title, value, icon: Icon, accent }: { title: string; value: string | number; icon: React.ElementType; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-1">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", accent || "text-muted-foreground")} />
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
      </div>
      <p className="text-xl font-black text-foreground">{value}</p>
    </div>
  );
}

export default function OnboardingQualityDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vertical, setVertical] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const { data: stats, isLoading: statsLoading } = useOnboardingQualityDashboard();
  const { data: queue, isLoading: queueLoading, refetch } = useOnboardingReviewQueue({
    reviewStatus: statusFilter || undefined,
    vertical: vertical || undefined,
  });

  const handleApprove = async (id: string) => {
    try {
      await approveReviewQueueItem(id, user?.id);
      toast.success("Approved & published");
      refetch();
    } catch { toast.error("Failed to approve"); }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectReviewQueueItem(id, "Quality insufficient", user?.id);
      toast.success("Rejected");
      refetch();
    } catch { toast.error("Failed to reject"); }
  };

  const handleRecrawl = async (item: any) => {
    try {
      await markNeedsRecrawl(item.id, item.entity_id, item.vertical, "Manual recrawl", user?.id);
      toast.success("Recrawl queued");
      refetch();
    } catch { toast.error("Failed to queue recrawl"); }
  };

  const statusTabs = [
    { key: "pending", label: "Pending" },
    { key: "in_review", label: "In Review" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "needs_recrawl", label: "Recrawl" },
  ];

  return (
    <div className="app-mobile-page bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted/60 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Onboarding Quality</h1>
          <p className="text-[10px] text-muted-foreground">Review queue · Quality scores · Publish gate</p>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 app-mobile-content">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            <StatCard title="Pending" value={stats.pending} icon={Clock} accent="text-amber-500" />
            <StatCard title="Approved" value={stats.approved} icon={CheckCircle} accent="text-emerald-500" />
            <StatCard title="Rejected" value={stats.rejected} icon={XCircle} accent="text-destructive" />
            <StatCard title="In Review" value={stats.inReview} icon={Eye} accent="text-primary" />
            <StatCard title="Recrawl" value={stats.needsRecrawl} icon={RotateCcw} accent="text-blue-500" />
            <StatCard title="Avg Quality" value={`${Math.round(stats.avgQuality * 100)}%`} icon={Shield} accent="text-primary" />
          </div>
        )}

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors",
                  statusFilter === tab.key ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <select
            value={vertical}
            onChange={(e) => setVertical(e.target.value)}
            className="h-9 rounded-xl border border-border/30 px-3 bg-card text-sm text-foreground w-full"
          >
            <option value="">All verticals</option>
            <option value="food">Food</option>
            <option value="grocery">Grocery</option>
            <option value="hotel">Hotel</option>
            <option value="services">Services</option>
            <option value="property">Property</option>
          </select>
        </div>

        {/* Queue List */}
        <div className="space-y-2">
          {queueLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading…</div>
          ) : !queue || queue.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No items in this queue.</div>
          ) : (
            queue.map((item: any) => (
              <div key={item.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
                <div>
                  <p className="text-sm font-bold text-foreground">{item.metadata_json?.canonicalName ?? item.entity_id}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {item.vertical} · {item.review_status} · priority {item.priority}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Quality: {Math.round(Number(item.quality_score ?? 0))} · Missing: {(item.missing_fields_json ?? []).join(", ") || "none"}
                  </p>
                  {item.warnings_json?.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <p className="text-[9px] text-amber-500">{item.warnings_json.join(", ")}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold active:scale-95 transition-transform"
                  >
                    <CheckCircle className="w-3 h-3" /> Approve
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold active:scale-95 transition-transform"
                  >
                    <XCircle className="w-3 h-3" /> Reject
                  </button>
                  <button
                    onClick={() => handleRecrawl(item)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold active:scale-95 transition-transform"
                  >
                    <RotateCcw className="w-3 h-3" /> Recrawl
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
