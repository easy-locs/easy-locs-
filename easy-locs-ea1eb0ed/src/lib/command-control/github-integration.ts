import { Level3GateError } from "./monitoring/level3-controlled";
import { logAuditEvent } from "./audit-log";
import { db } from "@/services/db";

const GITHUB_API = "https://api.github.com";

export async function createGithubIssue(params: {
  token: string;
  repo: string;
  title: string;
  body: string;
  labels?: string[];
  draft?: boolean;
}): Promise<{ number: number; url: string } | null> {
  if (!params.token || !params.repo) return null;

  try {
    const issueBody = params.draft
      ? `> **Draft Issue** — This issue was auto-generated for human review.\n\n${params.body}`
      : params.body;

    const res = await fetch(`${GITHUB_API}/repos/${params.repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `token ${params.token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: params.title,
        body: issueBody,
        labels: params.labels || [],
      }),
    });

    if (!res.ok) {
      console.error("[github] Failed to create issue:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return { number: data.number, url: data.html_url };
  } catch (err) {
    console.error("[github] Error creating issue:", err);
    return null;
  }
}

export async function triggerVercelDeploy(params: {
  vercelToken: string;
  projectId: string;
  teamId?: string;
}): Promise<{ id: string; url: string } | null> {
  if (!params.vercelToken || !params.projectId) return null;

  try {
    const queryParams = params.teamId ? `?teamId=${params.teamId}` : "";
    const res = await fetch(`https://api.vercel.com/v13/deployments${queryParams}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: params.projectId,
        target: "production",
        project: params.projectId,
      }),
    });

    if (!res.ok) {
      console.error("[vercel] Failed to trigger deploy:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return { id: data.id, url: data.url };
  } catch (err) {
    console.error("[vercel] Error triggering deploy:", err);
    return null;
  }
}

export async function getVercelDeploymentStatus(params: {
  vercelToken: string;
  deploymentId: string;
  teamId?: string;
}): Promise<{ status: string; url: string } | null> {
  if (!params.vercelToken || !params.deploymentId) return null;

  try {
    const queryParams = params.teamId ? `?teamId=${params.teamId}` : "";
    const res = await fetch(`https://api.vercel.com/v13/deployments/${params.deploymentId}${queryParams}`, {
      headers: { Authorization: `Bearer ${params.vercelToken}` },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return { status: data.readyState, url: data.url };
  } catch {
    return null;
  }
}

async function verifyHumanTrigger(findingId: string): Promise<{ agentActionId: string }> {
  const { data: finding, error } = await db("monitoring_findings")
    .select("*")
    .eq("id", findingId)
    .eq("level", 3)
    .eq("status", "acknowledged")
    .single();

  if (error || !finding) {
    throw new Level3GateError(
      "Human trigger not found. A human must approve this execution via triggerControlledExecution() before proceeding.",
      ["human_trigger_required"],
      findingId
    );
  }

  const findingData = finding.finding_data as Record<string, unknown>;
  const expectedAgent = findingData.agent_name as string;
  const expectedAction = findingData.action_type as string;

  const { data: action } = await db("agent_actions")
    .select("id, metadata")
    .eq("status", "running")
    .eq("agent_name", expectedAgent || "unknown")
    .eq("action_type", expectedAction || "controlled_execution");

  const matchedAction = (action || []).find((a: { metadata: Record<string, unknown> }) => {
    return a.metadata && (a.metadata as Record<string, unknown>).finding_id === findingId;
  });

  if (!matchedAction) {
    throw new Level3GateError(
      `No matching running agent action found for finding ${findingId} (agent: ${expectedAgent}, type: ${expectedAction}). Execution has not been authorized.`,
      ["agent_action_missing", "finding_action_mismatch"],
      findingId
    );
  }

  return { agentActionId: matchedAction.id };
}

export async function gatedCreateBranch(params: {
  token: string;
  repo: string;
  branchName: string;
  fromSha: string;
  agentName: string;
  findingId: string;
}): Promise<{ ref: string; agentActionId: string }> {
  const { agentActionId } = await verifyHumanTrigger(params.findingId);

  const res = await fetch(`${GITHUB_API}/repos/${params.repo}/git/refs`, {
    method: "POST",
    headers: {
      Authorization: `token ${params.token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref: `refs/heads/${params.branchName}`,
      sha: params.fromSha,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create branch: ${res.status} ${errText}`);
  }

  const data = await res.json();

  await logAuditEvent({
    event_type: "agent_branch_created",
    actor_type: "agent",
    actor_name: params.agentName,
    action: `Created branch ${params.branchName} (human-gated)`,
    target_type: "branch",
    target_id: params.branchName,
    details: { finding_id: params.findingId, agent_action_id: agentActionId, sha: params.fromSha },
  });

  return { ref: data.ref, agentActionId };
}

export async function gatedCreatePR(params: {
  token: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
  agentName: string;
  findingId: string;
}): Promise<{ number: number; url: string; agentActionId: string }> {
  const { agentActionId } = await verifyHumanTrigger(params.findingId);

  const res = await fetch(`${GITHUB_API}/repos/${params.repo}/pulls`, {
    method: "POST",
    headers: {
      Authorization: `token ${params.token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create PR: ${res.status} ${errText}`);
  }

  const data = await res.json();

  await logAuditEvent({
    event_type: "agent_pr_created",
    actor_type: "agent",
    actor_name: params.agentName,
    action: `Created PR #${data.number}: ${params.title} (human-gated)`,
    target_type: "pull_request",
    target_id: String(data.number),
    details: { finding_id: params.findingId, agent_action_id: agentActionId, head: params.head, base: params.base },
  });

  return { number: data.number, url: data.html_url, agentActionId };
}

export { Level3GateError };
