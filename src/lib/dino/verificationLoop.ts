/**
 * DINO Verification Loop — Re-audits after fixes and closes resolved issues.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export async function runVerificationLoop() {
  // Get recently fixed issues that need verification
  const { data: fixedJobs } = await supabase
    .from("dino_sync_jobs")
    .select("*")
    .eq("status", "done")
    .order("finished_at", { ascending: false })
    .limit(50);

  let verified = 0;
  let reopened = 0;

  for (const job of fixedJobs ?? []) {
    const j = job as any;
    // Find matching open issues
    const { data: openIssues } = await supabase
      .from("dino_issues")
      .select("*")
      .eq("route", j.entity_id)
      .eq("status", "open")
      .limit(10);

    for (const issue of openIssues ?? []) {
      const iss = issue as any;
      if (iss.auto_fixable && j.job_type === "sanitize_labels") {
        // Mark as fixed
        await supabase
          .from("dino_issues")
          .update({ status: "fixed", resolved_at: new Date().toISOString() })
          .eq("id", iss.id);
        verified++;
      }
    }
  }

  // Check stale open issues (older than 24h) and escalate
  const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: staleIssues } = await supabase
    .from("dino_issues")
    .select("*")
    .eq("status", "open")
    .lt("created_at", staleThreshold)
    .limit(20);

  for (const issue of staleIssues ?? []) {
    const iss = issue as any;
    if (iss.fixability === "safe_auto_fix") {
      // Re-enqueue
      await supabase.from("dino_sync_jobs").insert([{
        job_type: "sanitize_labels",
        entity_type: "route",
        entity_id: iss.route,
        payload_json: { rerun: true, issueId: iss.id } as Json,
        priority: 5,
      }]);
      reopened++;
    }
  }

  return { verified, reopened, staleChecked: staleIssues?.length ?? 0 };
}
