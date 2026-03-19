/**
 * DINO Full Audit — Runs a complete sync audit cycle.
 */

import { supabase } from "@/integrations/supabase/client";
import { runFullScan } from "./dinoScanner";
import { auditLabels } from "@/lib/design/pageAudit";
import { classifyFindings } from "./dinoIssueClassifier";
import { applyAutoFixes } from "./dinoAutoFix";
import { saveQualityScore } from "./saveQualityScore";
import { enqueueDinoJob } from "./jobQueue";
import type { Json } from "@/integrations/supabase/types";

export async function runFullSyncAudit() {
  const { data: run, error: runError } = await supabase
    .from("dino_runs")
    .insert([{ run_type: "full_sync_audit", status: "running" }])
    .select()
    .single();

  if (runError) throw runError;

  try {
    const scan = runFullScan();

    const findings = [];
    for (const page of scan.pages) {
      findings.push(...auditLabels([page.label, page.group], page.path));
    }

    const classified = classifyFindings(findings);
    const fixes = applyAutoFixes(classified);

    if (classified.length > 0) {
      await supabase.from("dino_issues").insert(
        classified.map((c) => ({
          severity: c.finding.severity,
          issue_type: c.finding.type,
          route: c.finding.page,
          summary: c.finding.description,
          details_json: { actual: c.finding.actual, expected: c.finding.expected } as Json,
          auto_fixable: c.autoFixSafe,
          fixability: c.finding.fixability,
          status: c.autoFixSafe ? "fixed" : "open",
        }))
      );
    }

    for (const c of classified) {
      if (!c.autoFixSafe) {
        await enqueueDinoJob({
          jobType: "sanitize_labels",
          entityType: "route",
          entityId: c.finding.page,
          payload: { description: c.finding.description },
          priority: 10,
        });
      }
    }

    const routeGroups = Object.entries(scan.routeGroups);
    for (const [group] of routeGroups) {
      const groupIssues = classified.filter((c) => c.finding.page.includes(group));
      const issueCount = groupIssues.length;
      await saveQualityScore({
        route: `/${group}`,
        ui: issueCount > 3 ? 55 : 90,
        ux: 85,
        stability: 88,
        media: 80,
        i18n: issueCount > 0 ? 65 : 92,
        category: 82,
        details: { issueCount, group },
      });
    }

    const fixedCount = fixes.filter((f) => f.applied).length;
    await supabase
      .from("dino_runs")
      .update({
        status: "done",
        ended_at: new Date().toISOString(),
        scanned_pages: scan.totalPages,
        issues_found: classified.length,
        issues_fixed: fixedCount,
      })
      .eq("id", run.id);

    return {
      runId: run.id,
      scannedPages: scan.totalPages,
      issuesFound: classified.length,
      issuesFixed: fixedCount,
    };
  } catch (err) {
    await supabase
      .from("dino_runs")
      .update({ status: "failed", ended_at: new Date().toISOString() })
      .eq("id", run.id);
    throw err;
  }
}
