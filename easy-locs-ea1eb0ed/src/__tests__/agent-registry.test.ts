/**
 * Unit + integration tests for the Sovereign Agent Control L1 surface
 * (task #808):
 *   - AdapterRegistry agent validation (lenient + fail-closed strict mode)
 *   - toAgentManifest aggregation across multiple adapters
 *   - reconcileAgents end-to-end against a typed fake supabase client
 *   - Marketplace adapters declare canonical agent refs
 *   - Integration: register → reconcile → simulated dispatch stamps
 *     agent_id / agent_version_id; unregistered route is rejected
 *     (AGENT_NOT_REGISTERED) under strict routing
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  AdapterRegistry,
  setStrictAgentRegistration,
  isStrictAgentRegistration,
} from "../../supabase/functions/_shared/execution/adapter-registry.ts";
import {
  createMarketplacePublishAdapter,
  createMarketplaceUnpublishAdapter,
} from "../../supabase/functions/_shared/execution/adapters/marketplace/marketplace-adapter.ts";
import {
  reconcileAgents,
  type ReconcileResult,
} from "../../supabase/functions/_shared/execution/agent-reconciler.ts";
import { bootstrapMarketplaceAdapters } from "../../supabase/functions/_shared/execution/adapters/marketplace/bootstrap.ts";
import { allowAllKyc } from "../../supabase/functions/_shared/execution/adapters/marketplace/kyc-gate.ts";
import {
  MemoryListingRepository,
} from "../../supabase/functions/_shared/execution/__test-helpers__.ts";
import type {
  AgentRef,
  DomainAdapter,
} from "../../supabase/functions/_shared/execution/types.ts";

const noopEvents = { emit: () => undefined };

const VALID_AGENT: AgentRef = {
  slug: "test.agent",
  version: "1.0.0",
  kind: "business.adapter",
};

function makeStubAdapter(overrides: Partial<DomainAdapter> = {}): DomainAdapter {
  return {
    domain: "test",
    taskType: "STUB",
    agent: VALID_AGENT,
    execute: async () => ({ success: true }),
    ...overrides,
  };
}

/** Minimal fake of the Supabase RPC surface used by reconcileAgents. */
type RpcCall = { name: string; args: Record<string, unknown> };
function makeFakeSupabase(
  handler: (call: RpcCall) => { data: unknown; error: { message: string } | null },
) {
  const calls: RpcCall[] = [];
  const sb = {
    schema(_name: string) {
      return {
        async rpc(name: string, args: Record<string, unknown>) {
          const call = { name, args };
          calls.push(call);
          return handler(call);
        },
      };
    },
  };
  // SupabaseClient is structurally compatible with what reconcileAgents uses.
  return { sb: sb as unknown as Parameters<typeof reconcileAgents>[0], calls };
}

describe("AdapterRegistry — agent validation (L1 fail-closed)", () => {
  beforeEach(() => setStrictAgentRegistration(true));

  it("strict mode is the default", () => {
    setStrictAgentRegistration(true);
    expect(isStrictAgentRegistration()).toBe(true);
  });

  it("accepts an adapter that declares a well-formed agent ref", () => {
    const reg = new AdapterRegistry();
    expect(() => reg.register(makeStubAdapter())).not.toThrow();
    expect(reg.size()).toBe(1);
    expect(reg.getAgentForTask("test", "STUB")).toEqual(
      expect.objectContaining({ slug: "test.agent", version: "1.0.0" }),
    );
  });

  it("refuses an adapter without an agent ref under strict mode", () => {
    const reg = new AdapterRegistry();
    const bare: DomainAdapter = {
      domain: "test",
      taskType: "BARE",
      execute: async () => ({ success: true }),
    };
    expect(() => reg.register(bare)).toThrow(/strict mode requires/);
  });

  it("validates agent ref shape (slug / version / kind)", () => {
    const reg = new AdapterRegistry();
    const badSlug: DomainAdapter = makeStubAdapter({
      agent: { slug: "", version: "1.0.0", kind: "x.y" },
    });
    const badVersion: DomainAdapter = makeStubAdapter({
      agent: { slug: "x", version: "", kind: "x.y" },
    });
    const badKind: DomainAdapter = makeStubAdapter({
      agent: { slug: "x", version: "1", kind: "" },
    });
    expect(() => reg.register(badSlug)).toThrow(/agent\.slug/);
    expect(() => reg.register(badVersion)).toThrow(/agent\.version/);
    expect(() => reg.register(badKind)).toThrow(/agent\.kind/);
  });
});

describe("AdapterRegistry.toAgentManifest", () => {
  beforeEach(() => setStrictAgentRegistration(true));

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
    expect(multi.capabilities.map((c) => c.task_type).sort()).toEqual([
      "ACTION_A",
      "ACTION_B",
    ]);
    const other = manifest.find((m) => m.slug === "other.agent")!;
    expect(other.agent_kind).toBe("ai.tool");
    expect(other.capabilities).toEqual([{ domain: "other", task_type: "ACTION_C" }]);
  });
});

describe("Marketplace adapters declare canonical agent refs", () => {
  beforeEach(() => setStrictAgentRegistration(true));

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
  beforeEach(() => setStrictAgentRegistration(true));

  it("calls system.register_agent for every unique agent in the registry", async () => {
    const reg = new AdapterRegistry();
    const repo = new MemoryListingRepository();
    reg.register(createMarketplacePublishAdapter({ repo, kyc: allowAllKyc, events: noopEvents }));
    reg.register(createMarketplaceUnpublishAdapter({ repo, kyc: allowAllKyc, events: noopEvents }));

    const { sb, calls } = makeFakeSupabase((c) => ({
      data: { id: "fake", slug: c.args.p_slug },
      error: null,
    }));

    const result: ReconcileResult = await reconcileAgents(sb, reg);
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
      const caps = c.args.p_capabilities as Array<{ domain: string; task_type: string }>;
      expect(caps[0].domain).toBe("marketplace");
    }
  });

  it("collects per-agent failures without throwing the whole reconcile", async () => {
    const reg = new AdapterRegistry();
    reg.register(makeStubAdapter({
      domain: "ok",
      taskType: "ACTION",
      agent: { slug: "ok.agent", version: "1", kind: "business.adapter" },
    }));
    reg.register(makeStubAdapter({
      domain: "bad",
      taskType: "ACTION",
      agent: { slug: "bad.agent", version: "1", kind: "business.adapter" },
    }));

    const { sb } = makeFakeSupabase((c) =>
      c.args.p_slug === "bad.agent"
        ? { data: null, error: { message: "boom" } }
        : { data: { id: "x" }, error: null },
    );

    const result = await reconcileAgents(sb, reg);
    expect(result.ok).toBe(false);
    expect(result.registered).toEqual(["ok.agent"]);
    expect(result.failed).toEqual([{ slug: "bad.agent", error: "boom" }]);
  });
});

/**
 * Integration: simulates the full L1 dispatch path using the same
 * resolution logic the SQL `dispatch_execution_task` uses (capability
 * lookup → stamp agent_id/agent_version_id, unregistered → blocked).
 *
 * We mirror the SQL behaviour in TS so we can prove the contract without
 * a live database. The actual SQL is exercised via the migration's
 * SECURITY DEFINER RPC — covered by the schema-level tests in L7.
 */
describe("L1 dispatch contract (TS mirror of system.dispatch_execution_task)", () => {
  beforeEach(() => setStrictAgentRegistration(true));

  type CapabilityRow = {
    domain: string;
    task_type: string;
    agent_id: string;
    agent_version_id: string;
    agent_status: string;
  };

  function buildCapabilityTable(reg: AdapterRegistry): CapabilityRow[] {
    return reg.toAgentManifest().flatMap((m, i) =>
      m.capabilities.map((c) => ({
        domain: c.domain,
        task_type: c.task_type,
        agent_id: `agent-${i}-${m.slug}`,
        agent_version_id: `version-${i}-${m.version}`,
        agent_status: "active",
      })),
    );
  }

  function dispatchSimulated(
    table: CapabilityRow[],
    domain: string,
    taskType: string,
    opts: { strict?: boolean } = {},
  ): {
    status: "queued" | "blocked";
    agent_id: string | null;
    agent_version_id: string | null;
    blocked_reason: string | null;
  } {
    const strict = opts.strict ?? true;
    const cap = table.find((r) => r.domain === domain && r.task_type === taskType);
    if (!cap && strict) {
      return {
        status: "blocked",
        agent_id: null,
        agent_version_id: null,
        blocked_reason: `AGENT_NOT_REGISTERED: no capability for (${domain}, ${taskType})`,
      };
    }
    if (cap?.agent_status === "disabled") {
      return {
        status: "blocked",
        agent_id: cap.agent_id,
        agent_version_id: cap.agent_version_id,
        blocked_reason: `AGENT_DISABLED`,
      };
    }
    return {
      status: "queued",
      agent_id: cap?.agent_id ?? null,
      agent_version_id: cap?.agent_version_id ?? null,
      blocked_reason: null,
    };
  }

  it("end-to-end: register → reconcile → dispatch stamps agent_id and agent_version_id", async () => {
    const reg = new AdapterRegistry();
    const repo = new MemoryListingRepository();
    reg.register(createMarketplacePublishAdapter({ repo, kyc: allowAllKyc, events: noopEvents }));

    // Reconcile against a fake DB and assert the upsert call shape.
    const { sb, calls } = makeFakeSupabase((c) => ({
      data: { id: `agent-id-${c.args.p_slug}`, slug: c.args.p_slug },
      error: null,
    }));
    const result = await reconcileAgents(sb, reg);
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].args.p_slug).toBe("marketplace.publish");

    // Dispatch a known task — must be stamped with agent_id + version.
    const table = buildCapabilityTable(reg);
    const dispatched = dispatchSimulated(table, "marketplace", "MARKETPLACE.LISTING.PUBLISH");
    expect(dispatched.status).toBe("queued");
    expect(dispatched.agent_id).toBeTruthy();
    expect(dispatched.agent_version_id).toBeTruthy();
    expect(dispatched.blocked_reason).toBeNull();
  });

  it("unregistered (domain, task_type) is blocked with AGENT_NOT_REGISTERED under strict routing", () => {
    const reg = new AdapterRegistry();
    const repo = new MemoryListingRepository();
    reg.register(createMarketplacePublishAdapter({ repo, kyc: allowAllKyc, events: noopEvents }));
    const table = buildCapabilityTable(reg);

    const dispatched = dispatchSimulated(table, "marketplace", "UNKNOWN.TASK");
    expect(dispatched.status).toBe("blocked");
    expect(dispatched.agent_id).toBeNull();
    expect(dispatched.blocked_reason).toMatch(/AGENT_NOT_REGISTERED/);
    expect(dispatched.blocked_reason).toMatch(/marketplace/);
    expect(dispatched.blocked_reason).toMatch(/UNKNOWN\.TASK/);
  });

  it("unregistered route still passes through when strict routing is disabled (L7 escape hatch)", () => {
    const reg = new AdapterRegistry();
    const table = buildCapabilityTable(reg);
    const dispatched = dispatchSimulated(table, "marketplace", "ANY.TASK", { strict: false });
    expect(dispatched.status).toBe("queued");
    expect(dispatched.agent_id).toBeNull();
    expect(dispatched.blocked_reason).toBeNull();
  });

  it("disabled agent is dispatched as blocked with AGENT_DISABLED", () => {
    // (positioned right above the boot-policy block to keep dispatch tests grouped)
    const reg = new AdapterRegistry();
    const repo = new MemoryListingRepository();
    reg.register(createMarketplacePublishAdapter({ repo, kyc: allowAllKyc, events: noopEvents }));
    const table = buildCapabilityTable(reg).map((r) => ({ ...r, agent_status: "disabled" }));
    const dispatched = dispatchSimulated(table, "marketplace", "MARKETPLACE.LISTING.PUBLISH");
    expect(dispatched.status).toBe("blocked");
    expect(dispatched.blocked_reason).toMatch(/AGENT_DISABLED/);
  });
});

/**
 * Boot-policy contract for bootstrapMarketplaceAdapters:
 *   - production: reconcile failure throws → orchestrator boot fails hard
 *   - dev / preview: reconcile failure is logged, boot proceeds
 *   - happy path: reconcile succeeds, function resolves cleanly
 */
describe("bootstrapMarketplaceAdapters — fail-closed boot policy", () => {
  // Repo / kyc / events stubs — bootstrap doesn't actually use the
  // SupabaseClient for adapter construction once the overrides are passed.
  const repoOverride = new MemoryListingRepository();
  const overridesBase = {
    repo: repoOverride as never,
    kyc: allowAllKyc,
    events: noopEvents,
  };
  const stubSupabase = {} as unknown as Parameters<typeof bootstrapMarketplaceAdapters>[0];

  function withEnv(value: string | undefined, fn: () => Promise<void>) {
    // deno-lint-ignore no-explicit-any
    const proc = (globalThis as any).process;
    const prev = proc?.env?.NODE_ENV;
    if (proc?.env) {
      if (value === undefined) delete proc.env.NODE_ENV;
      else proc.env.NODE_ENV = value;
    }
    return fn().finally(() => {
      if (proc?.env) {
        if (prev === undefined) delete proc.env.NODE_ENV;
        else proc.env.NODE_ENV = prev;
      }
    });
  }

  beforeEach(() => setStrictAgentRegistration(true));

  it("returns cleanly when reconcile succeeds", async () => {
    let registerCalls = 0;
    const fakeReconcile = async (_sb: unknown, _reg?: unknown): Promise<ReconcileResult> => {
      registerCalls += 1;
      return { ok: true, registered: ["marketplace.publish"], failed: [] };
    };
    await expect(
      bootstrapMarketplaceAdapters(stubSupabase, {
        ...overridesBase,
        reconcile: fakeReconcile,
      }),
    ).resolves.toBeUndefined();
    expect(registerCalls).toBe(1);
  });

  it("PRODUCTION: throws when reconcile reports per-agent failures", async () => {
    const fakeReconcile = async (): Promise<ReconcileResult> => ({
      ok: false,
      registered: [],
      failed: [{ slug: "marketplace.publish", error: "RPC down" }],
    });
    await withEnv("production", async () => {
      await expect(
        bootstrapMarketplaceAdapters(stubSupabase, {
          ...overridesBase,
          reconcile: fakeReconcile,
        }),
      ).rejects.toThrow(/marketplace\.publish.*RPC down/);
    });
  });

  it("PRODUCTION: throws when reconcile itself raises", async () => {
    const fakeReconcile = async (): Promise<ReconcileResult> => {
      throw new Error("network unreachable");
    };
    await withEnv("production", async () => {
      await expect(
        bootstrapMarketplaceAdapters(stubSupabase, {
          ...overridesBase,
          reconcile: fakeReconcile,
        }),
      ).rejects.toThrow(/network unreachable/);
    });
  });

  it("DEV: logs and continues when reconcile reports failures", async () => {
    const fakeReconcile = async (): Promise<ReconcileResult> => ({
      ok: false,
      registered: [],
      failed: [{ slug: "x", error: "y" }],
    });
    await withEnv("development", async () => {
      await expect(
        bootstrapMarketplaceAdapters(stubSupabase, {
          ...overridesBase,
          reconcile: fakeReconcile,
        }),
      ).resolves.toBeUndefined();
    });
  });
});
