/**
 * L4 — /admin/agents cockpit (#813).
 *
 * Pure-logic guards:
 *   - Kind → meta lookup is total (every registered kind resolves; unknown
 *     falls back without throwing).
 *   - Repo never branches on `agent_kind` (kind-agnostic invariant).
 *   - Repo emits the correct RPC name + arg shape for set_agent_status.
 *   - Status mutation is the only allowed write path (no direct UPDATE on
 *     `system.agents`).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  AGENT_KIND_META,
  KNOWN_AGENT_KINDS,
  getKindMeta,
} from "../components/admin/agents/agent-kind";

const rpcCalls: Array<{ schema: string; fn: string; args: unknown }> = [];
const fromCalls: Array<{ schema: string; table: string }> = [];

vi.mock("@/services/db", () => {
  const makeQB = (schema: string) => ({
    from: (table: string) => {
      fromCalls.push({ schema, table });
      const qb = {
        select: () => qb,
        order: () => qb,
        eq: () => qb,
        limit: () => qb,
        maybeSingle: async () => ({ data: null, error: null }),
        then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
          resolve({ data: [], error: null }),
      };
      return qb;
    },
  });
  return {
    domainDb: { system: makeQB("system") },
    db: () => ({}),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    schema: (s: string) => ({
      rpc: async (fn: string, args: unknown) => {
        rpcCalls.push({ schema: s, fn, args });
        return { data: { ok: true }, error: null };
      },
    }),
    from: () => {
      const qb = {
        select: () => qb,
        filter: () => qb,
        order: () => qb,
        limit: async () => ({ data: [], error: null }),
      };
      return qb;
    },
  },
}));

import { agentsRepo } from "../lib/admin/agents-repo";

beforeEach(() => {
  rpcCalls.length = 0;
  fromCalls.length = 0;
});

describe("agent-kind meta", () => {
  it("resolves every canonical kind to a non-empty label and an icon", () => {
    for (const k of KNOWN_AGENT_KINDS) {
      const meta = getKindMeta(k);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.Icon).toBeDefined();
      expect(["default", "secondary", "outline", "destructive"]).toContain(
        meta.tone,
      );
    }
  });

  it("falls back to a generic chip for unknown kinds without throwing", () => {
    const meta = getKindMeta("totally.unknown");
    expect(meta.label).toBe("totally.unknown");
    expect(meta.Icon).toBeDefined();
  });

  it("falls back for null/undefined kinds", () => {
    expect(getKindMeta(null).label).toBe("Unknown");
    expect(getKindMeta(undefined).label).toBe("Unknown");
  });

  it("the canonical kind list is exhaustive enough to cover the L1 enum", () => {
    // Sanity check: the kinds the L1 migration registers MUST appear here.
    const required = [
      "business.adapter",
      "ai.router",
      "ai.tool",
      "ops.scheduler",
      "dev.builder",
      "dev.reviewer",
      "dev.deployer",
      "asis.cognitive",
      "system.internal",
    ];
    for (const r of required) expect(AGENT_KIND_META[r]).toBeDefined();
  });
});

describe("agentsRepo writes", () => {
  it("setAgentStatus calls system.set_agent_status with the canonical arg shape", async () => {
    await agentsRepo.setAgentStatus({
      slug: "system.execution_loop",
      status: "canary",
      canaryPct: 25,
    });
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].schema).toBe("system");
    expect(rpcCalls[0].fn).toBe("set_agent_status");
    expect(rpcCalls[0].args).toEqual({
      p_slug: "system.execution_loop",
      p_status: "canary",
      p_canary_pct: 25,
    });
  });

  it("setAgentStatus omits canary when the status does not need it", async () => {
    await agentsRepo.setAgentStatus({
      slug: "ai.router",
      status: "disabled",
    });
    expect(rpcCalls[0].args).toMatchObject({
      p_slug: "ai.router",
      p_status: "disabled",
      p_canary_pct: null,
    });
  });
});

describe("agentsRepo reads", () => {
  it("listAgents reads from the L1/L2 views, never the raw agents table", async () => {
    await agentsRepo.listAgents();
    const tables = fromCalls.map((c) => c.table);
    expect(tables).toContain("v_agents_overview");
    expect(tables).toContain("v_agent_health");
    expect(tables).not.toContain("agents");
  });
});
