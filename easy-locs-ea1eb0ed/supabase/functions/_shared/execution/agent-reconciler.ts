/**
 * Agent Reconciler — bridges the in-process AdapterRegistry to the platform
 * `system.agents` / `system.agent_capabilities` tables (L1, task #808).
 *
 * On boot of any Edge Function that runs the orchestrator (e.g. the
 * execution-loop), call `reconcileAgents(supabase, registry)` once. It is
 * idempotent: it upserts agents by slug, attaches capabilities, and pins the
 * declared version as the agent's current_version_id.
 *
 * The reconciler is best-effort by design — failure to reach the DB does
 * NOT stop the function from booting (the orchestrator continues to function
 * with task agents stamped null on dispatch). All errors are logged.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { AdapterRegistry, globalAdapterRegistry, type AgentManifest } from "./adapter-registry.ts";

export interface ReconcileResult {
  ok: boolean;
  registered: string[];
  failed: Array<{ slug: string; error: string }>;
  total: number;
}

export async function reconcileAgents(
  sb: SupabaseClient,
  registry: AdapterRegistry = globalAdapterRegistry,
): Promise<ReconcileResult> {
  const manifest = registry.toAgentManifest();
  const registered: string[] = [];
  const failed: Array<{ slug: string; error: string }> = [];

  for (const agent of manifest) {
    try {
      await registerOne(sb, agent);
      registered.push(agent.slug);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[agent-reconciler] failed to register ${agent.slug}:`, msg);
      failed.push({ slug: agent.slug, error: msg });
    }
  }

  return { ok: failed.length === 0, registered, failed, total: manifest.length };
}

async function registerOne(sb: SupabaseClient, agent: AgentManifest): Promise<void> {
  const { error } = await sb.schema("system").rpc("register_agent", {
    p_slug: agent.slug,
    p_display_name: agent.display_name,
    p_agent_kind: agent.agent_kind,
    p_initial_version: agent.version,
    p_owner_team: agent.owner_team,
    p_status: "active",
    p_policy_profile: agent.policy_profile,
    p_quotas: agent.quotas,
    p_metadata: agent.metadata,
    p_capabilities: agent.capabilities,
    p_changelog: `Reconciled from in-process adapter registry`,
  });
  if (error) throw new Error(error.message);
}
