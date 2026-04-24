/**
 * Lightweight invariants for the controlled self-evolution layer.
 *
 * These tests exercise the chokepoint, safeguards, registry, monitoring
 * and Level-D feature flag without depending on a real test runner. The
 * file is intentionally framework-agnostic: each `it` block is a function
 * that throws on failure. A `describe` runner at the bottom executes them
 * if this file is invoked directly with Node, and any standard runner
 * (vitest/jest) will also pick up the exported `tests` if wired in later.
 */

import {
  approve,
  reject,
  commander,
  plannerAgent,
  auditAgent,
  runEvolutionCycle,
  getEvolutionConfig,
  setEvolutionConfig,
  resetEvolutionConfig,
  getSummary,
  isPaused,
  resume,
  listProposals,
  makeRepairAgent,
  EVOLUTION_DEFAULTS,
} from '../index';
import { clearRegistryForTests } from '../registry';
import { clearEventsForTests as clearEvents } from '../monitoring';
import { clearProposalsForTests as clearProposals } from '../approval';
import { resetCooldownForTests } from '../pipeline';

type Test = { name: string; fn: () => Promise<void> | void };
const tests: Test[] = [];
const it = (name: string, fn: Test['fn']) => tests.push({ name, fn });
const assert = (cond: unknown, msg: string) => {
  if (!cond) throw new Error('Assertion failed: ' + msg);
};

function resetAll() {
  clearRegistryForTests();
  clearProposals();
  clearEvents();
  resetCooldownForTests();
  resetEvolutionConfig();
}

it('Level D is disabled by default and cannot be flipped without env opt-in', () => {
  resetAll();
  assert(EVOLUTION_DEFAULTS.LEVEL_D_ENABLED === false, 'default LEVEL_D_ENABLED must be false');
  setEvolutionConfig({ LEVEL_D_ENABLED: true });
  const cfg = getEvolutionConfig();
  assert(cfg.LEVEL_D_ENABLED === false, 'LEVEL_D_ENABLED must remain false without env opt-in');
});

it('audit agent emits findings only and never proposes', () => {
  resetAll();
  const findings = auditAgent.scan([
    { domain: 'auth', severity: 'high', message: 'unguarded route', location: '/admin/x' },
  ]);
  assert(findings.length === 1, 'one finding expected');
  assert(findings[0].stage === 'audit', 'finding stage must be audit');
  const summary = getSummary();
  assert(summary.proposalsSuggested === 0, 'no proposals from audit alone');
});

it('planner produces suggested proposal that requires approval before execution', () => {
  resetAll();
  const finding = auditAgent.scan([
    { domain: 'auth', severity: 'high', message: 'unguarded', location: '/admin/y' },
  ])[0];
  const draft = plannerAgent.plan({
    finding,
    files: ['src/admin.ts'],
    rollbackPlan: 'revert src/admin.ts to HEAD',
  });
  assert(draft.status === 'suggested', 'planner output must be suggested');
  const result = commander.validateAndQueue(draft);
  assert(result.ok, 'commander should accept clean proposal');
  assert(result.proposal.status === 'suggested', 'commander must NOT auto-approve in Level C');
});

it('approval chokepoint: only human approver allowed when requiresHumanApproval', () => {
  resetAll();
  const finding = auditAgent.scan([
    { domain: 'auth', severity: 'high', message: 'unguarded', location: '/admin/z' },
  ])[0];
  const draft = plannerAgent.plan({ finding, files: ['a.ts'], rollbackPlan: 'revert a.ts' });
  commander.validateAndQueue(draft);
  const bad = approve(draft.id, { kind: 'commander', id: 'c1' });
  assert(!bad.ok, 'commander cannot approve human-required proposal');
  const good = approve(draft.id, { kind: 'human', id: 'alice' });
  assert(good.ok && good.proposal.status === 'approved', 'human approval must succeed');
});

it('registry rejects duplicate content hashes while active', () => {
  resetAll();
  const finding = auditAgent.scan([
    { domain: 'auth', severity: 'high', message: 'dup', location: '/x' },
  ])[0];
  const a = plannerAgent.plan({ finding, files: ['f.ts'], rollbackPlan: 'revert f.ts' });
  const b = plannerAgent.plan({ finding, files: ['f.ts'], rollbackPlan: 'revert f.ts' });
  commander.validateAndQueue(a);
  const second = commander.validateAndQueue(b);
  assert(!second.ok, 'duplicate content must be rejected');
  assert(second.rejectionReason === 'duplicate-content', 'reason must be duplicate-content');
});

it('safeguards: concurrent limit blocks new approvals beyond cap', () => {
  resetAll();
  setEvolutionConfig({ MAX_CONCURRENT_TASKS: 1 });
  const f = auditAgent.scan([{ domain: 'd', severity: 'low', message: 'm', location: 'l' }])[0];
  const p1 = plannerAgent.plan({ finding: f, files: ['a'], rollbackPlan: 'revert' });
  commander.validateAndQueue(p1);
  approve(p1.id, { kind: 'human', id: 'h' });
  const p2 = plannerAgent.plan({ finding: f, files: ['b'], rollbackPlan: 'revert' });
  const r2 = commander.validateAndQueue(p2);
  assert(!r2.ok, 'second proposal should be rejected by concurrency cap');
  assert(r2.rejectionReason === 'concurrent-limit-exceeded', 'reason must be concurrent-limit-exceeded');
});

it('safeguards: pipeline depth cap rejects too-deep proposals', () => {
  resetAll();
  setEvolutionConfig({ MAX_PIPELINE_DEPTH: 1 });
  const f = auditAgent.scan([{ domain: 'd', severity: 'low', message: 'm', location: 'l' }])[0];
  const deep = plannerAgent.plan({ finding: f, files: ['x'], rollbackPlan: 'revert', pipelineDepth: 5 });
  const r = commander.validateAndQueue(deep);
  assert(!r.ok, 'deep proposal should be rejected');
  assert(r.rejectionReason === 'pipeline-depth-exceeded', 'reason must be pipeline-depth-exceeded');
});

it('escalation: rejection streak pauses the pipeline', () => {
  resetAll();
  setEvolutionConfig({ REJECTION_ESCALATION_THRESHOLD: 2, MAX_PIPELINE_DEPTH: 0 });
  const f = auditAgent.scan([{ domain: 'd', severity: 'low', message: 'm', location: 'l' }])[0];
  for (let i = 0; i < 2; i++) {
    const p = plannerAgent.plan({ finding: f, files: [`f${i}.ts`], rollbackPlan: 'revert', pipelineDepth: 5 });
    commander.validateAndQueue(p);
  }
  assert(isPaused(), 'pipeline should be paused after rejection streak');
  resume({ kind: 'human', id: 'op' });
  assert(!isPaused(), 'human resume must work');
});

it('repair agent only runs on approved proposals', async () => {
  resetAll();
  let executed = 0;
  const repair = makeRepairAgent({
    execute: async () => { executed += 1; return { ok: true }; },
    rollback: async () => ({ ok: true, detail: 'ok' }),
  });
  const f = auditAgent.scan([{ domain: 'd', severity: 'low', message: 'm', location: 'l' }])[0];
  const p = plannerAgent.plan({ finding: f, files: ['a'], rollbackPlan: 'revert' });
  commander.validateAndQueue(p);
  // not yet approved
  await repair.run(p.id);
  assert(executed === 0, 'repair must not execute without approval');
  approve(p.id, { kind: 'human', id: 'h' });
  await repair.run(p.id);
  assert(executed === 1, 'repair must execute after approval');
  const proposals = listProposals({ status: 'completed' });
  assert(proposals.length === 1, 'one completed proposal expected');
});

it('cycle: cooldown blocks rapid re-runs', async () => {
  resetAll();
  setEvolutionConfig({ CYCLE_COOLDOWN_MS: 60_000 });
  const r1 = await runEvolutionCycle({
    scan: [{ domain: 'd', severity: 'low', message: 'm', location: 'l' }],
    planFor: (finding) => ({ files: [`f-${finding.id}.ts`], rollbackPlan: 'revert' }),
  });
  assert(!r1.cooldownActive, 'first cycle should run');
  const r2 = await runEvolutionCycle({
    scan: [{ domain: 'd', severity: 'low', message: 'm2', location: 'l' }],
    planFor: () => ({ files: ['f2.ts'], rollbackPlan: 'revert' }),
  });
  assert(r2.cooldownActive, 'second immediate cycle should be cooldown-blocked');
});

export async function runAllTests() {
  let pass = 0;
  let fail = 0;
  const failures: string[] = [];
  for (const t of tests) {
    try {
      await t.fn();
      pass += 1;
    } catch (e) {
      fail += 1;
      failures.push(`${t.name}: ${(e as Error).message}`);
    }
  }
  return { pass, fail, total: tests.length, failures };
}

// Self-run when executed directly (node loader).
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('evolution.test')) {
  runAllTests().then(r => {
    // eslint-disable-next-line no-console
    console.log(`evolution tests: ${r.pass}/${r.total} passed`);
    if (r.fail) {
      // eslint-disable-next-line no-console
      console.error(r.failures.join('\n'));
      process.exit(1);
    }
  });
}

// Vitest integration: run all collected tests via the framework runner.
// The file defines its own `it` helper (for direct-node compatibility), so we
// use the global `test` (not shadowed) to expose results to vitest.
describe('evolution layer', () => {
  test('all invariants pass', async () => {
    const { fail, failures } = await runAllTests();
    if (fail > 0) {
      throw new Error(`${fail} evolution invariant(s) failed:\n${failures.join('\n')}`);
    }
  });
});
