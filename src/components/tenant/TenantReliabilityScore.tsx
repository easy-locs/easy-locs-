import { useMemo } from "react";
import { Shield, ShieldCheck, ShieldAlert, Clock, FileCheck, CreditCard, CalendarCheck } from "lucide-react";
import { motion } from "framer-motion";

interface TenantScoreProps {
  tenant: {
    id: string;
    name: string;
    lease_start?: string;
    lease_end?: string;
  };
  rentCalls: any[];
  documents: any[];
}

interface ScoreFactor {
  label: string;
  icon: React.ElementType;
  score: number;
  maxScore: number;
  detail: string;
}

function computeTenantScore(tenant: TenantScoreProps["tenant"], rentCalls: any[], documents: any[]) {
  const factors: ScoreFactor[] = [];

  // Payment history (max 40 pts)
  const tenantCalls = rentCalls.filter((r: any) => r.tenant_id === tenant.id);
  const paidCalls = tenantCalls.filter((r: any) => r.paid);
  const paymentRate = tenantCalls.length > 0 ? paidCalls.length / tenantCalls.length : 1;
  const paymentScore = Math.round(paymentRate * 40);
  factors.push({
    label: "Payment History",
    icon: CreditCard,
    score: paymentScore,
    maxScore: 40,
    detail: tenantCalls.length > 0
      ? `${paidCalls.length}/${tenantCalls.length} payments on time (${Math.round(paymentRate * 100)}%)`
      : "No payment history yet",
  });

  // Lease duration (max 25 pts)
  const leaseStart = tenant.lease_start ? new Date(tenant.lease_start) : null;
  const monthsInLease = leaseStart
    ? Math.max(0, Math.floor((Date.now() - leaseStart.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 0;
  const durationScore = Math.min(25, Math.round((monthsInLease / 24) * 25));
  factors.push({
    label: "Lease Duration",
    icon: CalendarCheck,
    score: durationScore,
    maxScore: 25,
    detail: monthsInLease > 0 ? `${monthsInLease} months active` : "New tenant",
  });

  // Document verification (max 20 pts)
  const tenantDocs = documents.filter((d: any) => d.tenant_id === tenant.id || d.data_json?.tenant_id === tenant.id);
  const hasID = tenantDocs.some((d: any) => ["id-card", "passport", "identity"].some(t => d.doc_type?.includes(t)));
  const hasProof = tenantDocs.some((d: any) => ["proof", "address", "income"].some(t => d.doc_type?.includes(t)));
  const docScore = (hasID ? 10 : 0) + (hasProof ? 10 : 0);
  factors.push({
    label: "Documents",
    icon: FileCheck,
    score: docScore,
    maxScore: 20,
    detail: hasID && hasProof ? "ID & proof verified" : hasID ? "ID verified, missing proof" : "Documents pending",
  });

  // On-time rate bonus (max 15 pts)
  const lateCalls = tenantCalls.filter((r: any) => r.paid && r.paid_date && r.due_date && r.paid_date > r.due_date);
  const onTimeRate = tenantCalls.length > 0 ? 1 - (lateCalls.length / tenantCalls.length) : 1;
  const onTimeScore = Math.round(onTimeRate * 15);
  factors.push({
    label: "Punctuality",
    icon: Clock,
    score: onTimeScore,
    maxScore: 15,
    detail: lateCalls.length === 0 ? "Always on time" : `${lateCalls.length} late payment(s)`,
  });

  const totalScore = factors.reduce((s, f) => s + f.score, 0);

  return { totalScore, factors };
}

function scoreGrade(score: number) {
  if (score >= 85) return { label: "Excellent", color: "text-success", bg: "bg-success/10", icon: ShieldCheck };
  if (score >= 65) return { label: "Good", color: "text-accent", bg: "bg-accent/10", icon: Shield };
  if (score >= 45) return { label: "Average", color: "text-warning", bg: "bg-warning/10", icon: Shield };
  return { label: "At Risk", color: "text-destructive", bg: "bg-destructive/10", icon: ShieldAlert };
}

const TenantReliabilityScore = ({ tenant, rentCalls, documents }: TenantScoreProps) => {
  const { totalScore, factors } = useMemo(
    () => computeTenantScore(tenant, rentCalls, documents),
    [tenant, rentCalls, documents],
  );

  const grade = scoreGrade(totalScore);
  const GradeIcon = grade.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border/50 shadow-card p-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl ${grade.bg} flex items-center justify-center`}>
          <GradeIcon className={`h-5 w-5 ${grade.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Reliability Score</h3>
          <p className="text-xs text-muted-foreground">{tenant.name}</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold tabular-nums ${grade.color}`}>{totalScore}</div>
          <span className={`text-[10px] font-semibold ${grade.color}`}>{grade.label}</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${totalScore}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${
            totalScore >= 85 ? "bg-success" : totalScore >= 65 ? "bg-accent" : totalScore >= 45 ? "bg-warning" : "bg-destructive"
          }`}
        />
      </div>

      {/* Factors */}
      <div className="space-y-2.5">
        {factors.map((f, i) => (
          <div key={f.label} className="flex items-center gap-3">
            <f.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-medium text-foreground">{f.label}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">{f.score}/{f.maxScore}</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent/60 rounded-full transition-all"
                  style={{ width: `${(f.score / f.maxScore) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{f.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export { computeTenantScore, TenantReliabilityScore };
export default TenantReliabilityScore;
