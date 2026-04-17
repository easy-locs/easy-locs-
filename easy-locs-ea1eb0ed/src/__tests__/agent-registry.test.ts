/**
 * Unit tests for the Sovereign Agent Control L1 surface (task #808):
 *   - AdapterRegistry agent validation
 *   - toAgentManifest aggregation across multiple adapters
 *   - reconcileAgents end-to-end against a fake supabase client
 *   - Marketplace adapters declare the canonical agent refs
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  AdapterRegistry,
  setStrictAgentRegistration,
  isStrictAgentRegistration,
  type AgentManifest,
} from "../../supabase/functions/_shared/execution/adapter-registry.ts";
import {
  createMarketplacePublishAdapter,
  createMarketplaceUnpublishAdapter,
} from "../../supabase/functions/_shared/execution/adapters/marketplace/marketplace-adapter.ts";
import { reconcileAgents } from "../../supabase/functions/_shared/execution/agent-reconciler.ts";
import { allowAllKyc } from "../../supabase/functions/_shared/execution/adapters/marketplace/kyc-gate.ts";
import {
  MemoryListingRepository,
} from "../../supabase/functions/_shared/execution/__test-helpers__.ts";
import type { DomainAdapter } from "../../supabase/functions/_shared/execution/types.ts";

function makeStubAdapter(overrides: Partial<DomainAdapter> = {}): DomainAdapter {
  return {
    domain: "test",
    taskType: "STUB",
    execute: async () => ({ success: true }),
    ...overrides,
  };
}

const noopEvents = { emit: () => undefined };

describe("AdapterRegistry — agent validation (L1)", () => {
  beforeEach(() => setStrictAgentRegistration(false));

  it("accepts an adapter with no agent ref in lenient mode", () => {
    const reg = new AdapterRegistry();
    expect(() => reg.register(makeStubAdapter())).not.toThrow();
    expect(reg.size()).toBe(1);
  });

  it("refuses an adapter with no agent ref in strict mode", () => {
    setStrictAgentRegistration(true);
    expect(isStrictAgentRegistration()).toBe(true);
    const reg = new AdapterRegistry();
    expect(() => reg.register(makeStubAdapter())).toThrow(/strict mode requires/);
  });

  it("validates agent.slug / .version / .kind shape", () => {
    const reg = new AdapterRegistry();
    expect(() =>
      reg.register(makeStubAdapter({ agent: { slug: "", version: "1.0.0", kind: "x.y" } as any })),
    ).toThrow(/agent\.slug/);
    expect(() =>
      reg.register(makeStubAdapter({ agent: { slug: "x", version: "", kind: "x.y" } as any })),
    ).toThrow(/agent\.version/);
    expect(() =>
      reg.register(makeStubAdapter({ agent: { slug: "x", version: "1", kind: "" } as any })),
    ).toThrow(/agent\.kind/);
  });

  it("accepts a well-formed agent ref and exposes it via getAgentForTask", () => {
    const reg = new AdapterRegistry();
    reg.register(makeStubAdapter({
      agent: { slug: "test.agent", version: "1.2.3", kind: "business.adapter" },
    }));
    const ref = reg.getAgentForTask("test", "STUB");
    expect(ref).toEqual(expect.objectContaining({ slug: "test.agent", version: "1.2.3" }));
  });
});

describe("AdapterRegistry.toAgentManifest", () => {
  it("groups capabilities by slug across multiple adapters", () => {
    const reg = new AdapterRegistry();
    reg.register(makeStubAdapter({
      taskType: "ACTION_A",
      agent: { slug: "multi.agent", version: "1.0.0", kind: "business.adapter" },
    }));
    reg.register(makeStubAdapter({
      taskType: "ACTION_B",
      agent: { slug: "multi.agent", version: "1.0.0", kind: "business.adapter" },
    }));
    reg.register(makeStubAdapter({
      domain: "other",
      taskType: "ACTION_C",
      agent: { slug: "other.agent", version: "0.1.0", kind: "ai.tool" },
    }));

    const manifest = reg.toAgentManifest();
    expect(manifest).toHaveLength(2);
    const multi = manifest.find((m) => m.slug === "multi.agent")!;
    expect(multi.capabilities).toHaveLength(2);
    expect(multi.capabilities.map((c) => c.task_type).sort()).toEqual(["ACTION_A", "ACTION_B"]);
    const other = manifest.find((m) => m.slug === "other.agent")!;
    expect(other.agent_kind).toBe("ai.tool");
    expect(other.capabilities).toEqual([{ domain: "other", task_type: "ACTION_C" }]);
  });

  it("skips adapters without an agent ref", () => {
    const reg = new AdapterRegistry();
    reg.register(makeStubAdapter()); // no agent
    reg.register(makeStubAdapter({
      taskType: "WITH_AGENT",
      agent: { slug: "x.y", version: "1", kind: "business.adapter" },
    }));
    expect(reg.toAgentManifest()).toHaveLength(1);
  });
});

describe("Marketplace adapters declare canonical agent refs", () => {
  it("publish adapter binds to marketplace.publish 1.0.0", () => {
    const repo = new MemoryListingRepository();
    const adapter = createMarketplacePublishAdapter({
      repo,
      kyc: allowAllKyc,
      events: noopEvents,
    });
    expect(adapter.agent).toEqual(expect.objectContaining({
      slug: "marketplace.publish",
      version: "1.0.0",
      kind: "business.adapter",
      ownerTeam: "marketplace",
      policyProfile: "medium-approval",
    }));
  });

  it("unpublish adapter binds to marketplace.unpublish 1.0.0", () => {
    const repo = new MemoryListingRepository();
    const adapter = createMarketplaceUnpublishAdapter({
      repo,
      kyc: allowAllKyc,
      events: noopEvents,
    });
    expect(adapter.agent).toEqual(expect.objectContaining({
      slug: "marketplace.unpublish",
      kind: "business.adapter",
      policyProfile: "medium-default",
    }));
  });
});

describe("reconcileAgents", () => {
  it("calls system.register_agent for every unique agent in the registry", async () => {
    const reg = new AdapterRegistry();
    const repo = new MemoryListingRepository();
    reg.register(createMarketplacePublishAdapter({ repo, kyc: allowAllKyc, events: noopEvents }));
    reg.register(createMarketplaceUnpublishAdapter({ repo, kyc: allowAllKyc, events: noopEvents }));

    const calls: Array<{ name: string; args: any }> = [];
    const fakeSb: any = {
      schema: () => ({
        rpc: async (name: string, args: any) => {
          calls.push({ name, args });
          return { data: { id: "fake-id", slug: args.p_slug }, error: null };
        },
      }),
    };

    const result = await reconcileAgents(fakeSb, reg);
    expect(result.ok).toBe(true);
    expect(result.registered.sort()).toEqual([
      "marketplace.publish",
      "marketplace.unpublish",
    ]);
    expect(result.failed).toHaveLength(0);
    expect(calls).toHaveLength(2);
    for (const c of calls) {
      expect(c.name).toBe("register_agent");
      expect(c.args.p_agent_kind).toBe("business.adapter");
      expect(c.args.p_initial_version).toBe("1.0.0");
      expect(Array.isArray(c.args.p_capabilities)).toBe(true);
      expect(c.args.p_capabilities[0]).toHaveProperty("domain", "marketplace");
    }
  });

  it("collects per-agent failures without throwing the whole reconcile", async () => {
    const reg = new AdapterRegistry();
    reg.register({
      domain: "ok",
      taskType: "ACTION",
      execute: async () => ({ success: true }),
      agent: { slug: "ok.agent", version: "1", kind: "business.adapter" },
    });
    reg.register({
      domain: "bad",
      taskType: "ACTION",
      execute: async () => ({ success: true }),
      agent: { slug: "bad.agent", version: "1", kind: "business.adapter" },
    });

    const fakeSb: any = {
      schema: () => ({
        rpc: async (_name: string, args: any) => {
          if (args.p_slug === "bad.agent") {
            return { data: null, error: { message: "boom" } };
          }
          return { data: { id: "x" }, error: null };
        },
      }),
    };
    const result = await reconcileAgents(fakeSb, reg);
    expect(result.ok).toBe(false);
    expect(result.registered).toEqual(["ok.agent"]);
    expect(result.failed).toEqual([{ slug: "bad.agent", error: "boom" }]);
  });
});
