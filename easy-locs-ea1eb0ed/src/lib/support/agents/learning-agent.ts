import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import type { LearningInsight } from "../support-types";
import type { SupportIssueCategory, SupportUrgency } from "../canonical-support-taxonomy";

const ANALYSIS_WINDOW_DAYS = 14;
const MIN_OCCURRENCES_FOR_PATTERN = 5;

export async function runLearningAgent(): Promise<{
  insightsGenerated: number;
}> {
  const cutoff = new Date(Date.now() - ANALYSIS_WINDOW_DAYS * 86400000).toISOString();
  const insights: Omit<LearningInsight, "id" | "created_at">[] = [];

  const categoryPatterns = await analyzeRepeatedCategories(cutoff);
  insights.push(...categoryPatterns);

  const routingWeaknesses = await analyzeWeakTransfers(cutoff);
  insights.push(...routingWeaknesses);

  const shopPatterns = await analyzeLowPerformingShops(cutoff);
  insights.push(...shopPatterns);

  const frictionPoints = await analyzeUnresolvedClusters(cutoff);
  insights.push(...frictionPoints);

  for (const insight of insights) {
    await db("support_learning_insights").insert({
      insight_type: insight.insight_type,
      category: insight.category,
      description: insight.description,
      evidence_count: insight.evidence_count,
      suggested_action: insight.suggested_action,
      priority: insight.priority,
      status: "pending",
    });
  }

  if (insights.length > 0) {
    platformBus.emit("support:learning_insights_generated", {
      count: insights.length,
      types: insights.map((i) => i.insight_type),
    }, "system");
  }

  return { insightsGenerated: insights.length };
}

async function analyzeRepeatedCategories(
  since: string,
): Promise<Omit<LearningInsight, "id" | "created_at">[]> {
  const { data: sessions } = await db("support_sessions")
    .select("issue_category, resolved_by, status")
    .gte("created_at", since)
    .not("issue_category", "is", null);

  if (!sessions || sessions.length === 0) return [];

  const categoryCounts: Record<string, { total: number; unresolved: number }> = {};

  for (const s of sessions) {
    const cat = s.issue_category as string;
    if (!categoryCounts[cat]) categoryCounts[cat] = { total: 0, unresolved: 0 };
    categoryCounts[cat].total++;
    if (s.status !== "resolved" && s.status !== "closed") {
      categoryCounts[cat].unresolved++;
    }
  }

  const insights: Omit<LearningInsight, "id" | "created_at">[] = [];

  for (const [category, counts] of Object.entries(categoryCounts)) {
    if (counts.total >= MIN_OCCURRENCES_FOR_PATTERN) {
      const unresolvedRate = counts.unresolved / counts.total;
      if (unresolvedRate > 0.4) {
        insights.push({
          insight_type: "routing_improvement",
          category: category as SupportIssueCategory,
          description: `"${category}" has a ${Math.round(unresolvedRate * 100)}% unresolved rate across ${counts.total} sessions`,
          evidence_count: counts.total,
          suggested_action: `Review routing rules for "${category}" — consider adding direct AI resolution or faster escalation`,
          priority: unresolvedRate > 0.6 ? "high" : "medium",
          status: "pending",
        });
      }
    }
  }

  return insights;
}

async function analyzeWeakTransfers(
  since: string,
): Promise<Omit<LearningInsight, "id" | "created_at">[]> {
  const { data: transfers } = await db("support_traces")
    .select("session_id, event_type, data")
    .in("event_type", [
      "shop_transfer_initiated",
      "shop_transfer_accepted",
      "shop_transfer_timeout",
      "shop_transfer_rejected",
    ])
    .gte("created_at", since);

  if (!transfers || transfers.length === 0) return [];

  const sessionTransfers: Record<
    string,
    { initiated: number; accepted: number; failed: number }
  > = {};

  for (const t of transfers) {
    const sid = t.session_id as string;
    if (!sessionTransfers[sid])
      sessionTransfers[sid] = { initiated: 0, accepted: 0, failed: 0 };

    if (t.event_type === "shop_transfer_initiated") sessionTransfers[sid].initiated++;
    else if (t.event_type === "shop_transfer_accepted") sessionTransfers[sid].accepted++;
    else sessionTransfers[sid].failed++;
  }

  let totalInitiated = 0;
  let totalFailed = 0;

  for (const counts of Object.values(sessionTransfers)) {
    totalInitiated += counts.initiated;
    totalFailed += counts.failed;
  }

  const insights: Omit<LearningInsight, "id" | "created_at">[] = [];

  if (totalInitiated >= MIN_OCCURRENCES_FOR_PATTERN) {
    const failRate = totalFailed / totalInitiated;
    if (failRate > 0.3) {
      insights.push({
        insight_type: "routing_improvement",
        category: null,
        description: `Shop transfer failure rate is ${Math.round(failRate * 100)}% (${totalFailed}/${totalInitiated} transfers)`,
        evidence_count: totalInitiated,
        suggested_action:
          "Review shop availability requirements. Consider implementing shop readiness check before transfer.",
        priority: failRate > 0.5 ? "high" : "medium",
        status: "pending",
      });
    }
  }

  return insights;
}

async function analyzeLowPerformingShops(
  since: string,
): Promise<Omit<LearningInsight, "id" | "created_at">[]> {
  const { data: scores } = await db("shop_quality_scores")
    .select("*")
    .lt("overall_score", 0.5)
    .gte("last_updated", since);

  if (!scores || scores.length === 0) return [];

  return scores.map(
    (s: Record<string, unknown>): Omit<LearningInsight, "id" | "created_at"> => ({
      insight_type: "shop_pattern",
      category: null,
      description: `Shop ${(s.shop_id as string).slice(0, 8)} has quality score ${((s.overall_score as number) * 100).toFixed(0)}% — response rate: ${((s.response_rate as number) * 100).toFixed(0)}%, complaint rate: ${((s.complaint_rate as number) * 100).toFixed(0)}%`,
      evidence_count: 1,
      suggested_action: `Review shop ${(s.shop_id as string).slice(0, 8)} for compliance action. Consider restricting new orders until quality improves.`,
      priority:
        (s.overall_score as number) < 0.2
          ? ("critical" as SupportUrgency)
          : ("high" as SupportUrgency),
      status: "pending",
    }),
  );
}

async function analyzeUnresolvedClusters(
  since: string,
): Promise<Omit<LearningInsight, "id" | "created_at">[]> {
  const { data: unresolved } = await db("support_sessions")
    .select("issue_category, user_id")
    .in("status", ["active", "ai_handling", "ticket_created", "shop_unreachable"])
    .gte("created_at", since);

  if (!unresolved || unresolved.length < MIN_OCCURRENCES_FOR_PATTERN) return [];

  const userRepeatMap: Record<string, number> = {};
  for (const s of unresolved) {
    const uid = s.user_id as string;
    userRepeatMap[uid] = (userRepeatMap[uid] ?? 0) + 1;
  }

  const repeatUsers = Object.entries(userRepeatMap).filter(
    ([, count]) => count >= 3,
  );

  if (repeatUsers.length > 0) {
    return [
      {
        insight_type: "product_issue",
        category: null,
        description: `${repeatUsers.length} users have 3+ unresolved sessions in the last ${ANALYSIS_WINDOW_DAYS} days — potential UX friction point`,
        evidence_count: repeatUsers.length,
        suggested_action:
          "Investigate common patterns among repeat support users. Check for app bugs or confusing workflows.",
        priority: repeatUsers.length > 10 ? "high" : "medium",
        status: "pending",
      },
    ];
  }

  return [];
}
