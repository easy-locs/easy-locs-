import { db } from "@/services/db";
import type { ApprovalRequest, RiskAssessment } from "./types";
import { logAuditEvent } from "./audit-log";

export async function createApprovalRequest(params: {
  pr_number: number;
  pr_title: string;
  pr_url: string;
  preview_url?: string;
  diff_summary?: string;
  risk_assessment?: RiskAssessment;
  agent_name?: string;
  reviewer_email?: string;
}): Promise<ApprovalRequest | null> {
  const { data, error } = await db("approval_requests")
    .insert({
      pr_number: params.pr_number,
      pr_title: params.pr_title,
      pr_url: params.pr_url,
      preview_url: params.preview_url || null,
      diff_summary: params.diff_summary || null,
      risk_assessment: params.risk_assessment || "low",
      agent_name: params.agent_name || null,
      reviewer_email: params.reviewer_email || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[approval-workflow] Failed to create request:", error);
    return null;
  }

  await logAuditEvent({
    event_type: "approval_request_created",
    actor_type: "agent",
    actor_name: params.agent_name || "unknown",
    action: `Created approval request for PR #${params.pr_number}`,
    target_type: "pull_request",
    target_id: String(params.pr_number),
    details: { pr_title: params.pr_title, risk: params.risk_assessment },
  });

  return data as ApprovalRequest;
}

export async function approveRequest(token: string, feedback?: string): Promise<{
  success: boolean;
  approval?: ApprovalRequest;
  error?: string;
}> {
  const { data: existing, error: findErr } = await db("approval_requests")
    .select("*")
    .eq("approval_token", token)
    .eq("status", "pending")
    .single();

  if (findErr || !existing) {
    return { success: false, error: "Invalid or expired approval token" };
  }

  const { data, error } = await db("approval_requests")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      reviewer_feedback: feedback || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: "Failed to approve" };
  }

  await logAuditEvent({
    event_type: "pr_approved",
    actor_type: "human",
    action: `Approved PR #${existing.pr_number}: ${existing.pr_title}`,
    target_type: "pull_request",
    target_id: String(existing.pr_number),
    details: { feedback, risk: existing.risk_assessment },
  });

  return { success: true, approval: data as ApprovalRequest };
}

export async function rejectRequest(token: string, feedback?: string): Promise<{
  success: boolean;
  approval?: ApprovalRequest;
  error?: string;
}> {
  const { data: existing, error: findErr } = await db("approval_requests")
    .select("*")
    .eq("approval_token", token)
    .eq("status", "pending")
    .single();

  if (findErr || !existing) {
    return { success: false, error: "Invalid or expired approval token" };
  }

  const { data, error } = await db("approval_requests")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      reviewer_feedback: feedback || "Changes requested",
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: "Failed to reject" };
  }

  await logAuditEvent({
    event_type: "pr_rejected",
    actor_type: "human",
    action: `Rejected PR #${existing.pr_number}: ${existing.pr_title}`,
    target_type: "pull_request",
    target_id: String(existing.pr_number),
    details: { feedback: feedback || "Changes requested", risk: existing.risk_assessment },
  });

  return { success: true, approval: data as ApprovalRequest };
}

export async function getPendingApprovals(): Promise<ApprovalRequest[]> {
  const { data, error } = await db("approval_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[approval-workflow] Failed to fetch pending:", error);
    return [];
  }
  return (data || []) as ApprovalRequest[];
}

export async function getApprovalHistory(limit = 20): Promise<ApprovalRequest[]> {
  const { data, error } = await db("approval_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data || []) as ApprovalRequest[];
}

export function buildApprovalEmailHtml(approval: ApprovalRequest, baseUrl: string): string {
  const approveUrl = `${baseUrl}/api/command/approve?token=${approval.approval_token}`;
  const rejectUrl = `${baseUrl}/api/command/reject?token=${approval.approval_token}`;

  const riskColors: Record<string, string> = {
    low: "#22c55e",
    medium: "#f59e0b",
    high: "#ef4444",
    critical: "#dc2626",
  };
  const riskColor = riskColors[approval.risk_assessment] || "#6b7280";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="margin: 0 0 16px; color: #111827;">PR Review Required</h2>
    <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 8px; font-weight: 600; font-size: 16px;">#${approval.pr_number}: ${approval.pr_title}</p>
      ${approval.agent_name ? `<p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">Agent: ${approval.agent_name}</p>` : ""}
      <p style="margin: 0; font-size: 14px;">
        Risk: <span style="color: ${riskColor}; font-weight: 600;">${approval.risk_assessment.toUpperCase()}</span>
      </p>
    </div>
    ${approval.diff_summary ? `<div style="margin-bottom: 16px;"><h3 style="margin: 0 0 8px; font-size: 14px; color: #374151;">Diff Summary</h3><pre style="background: #f9fafb; padding: 12px; border-radius: 6px; font-size: 13px; overflow-x: auto; white-space: pre-wrap;">${approval.diff_summary}</pre></div>` : ""}
    ${approval.preview_url ? `<p style="margin-bottom: 16px;"><a href="${approval.preview_url}" style="color: #2563eb; text-decoration: none;">View Preview</a> | <a href="${approval.pr_url}" style="color: #2563eb; text-decoration: none;">View PR on GitHub</a></p>` : `<p style="margin-bottom: 16px;"><a href="${approval.pr_url}" style="color: #2563eb; text-decoration: none;">View PR on GitHub</a></p>`}
    <div style="display: flex; gap: 12px; margin-top: 20px;">
      <a href="${approveUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Approve & Merge</a>
      <a href="${rejectUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Reject</a>
    </div>
  </div>
  <p style="text-align: center; margin-top: 16px; color: #9ca3af; font-size: 12px;">Easy-Locs Command & Control</p>
</body>
</html>`;
}
