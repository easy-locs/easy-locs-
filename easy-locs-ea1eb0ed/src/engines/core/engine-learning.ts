import { engineMemory, type EngineMemoryRecord } from "./engine-memory";
import { engineObserver } from "./engine-observer";
import { signaturesAreSimilar } from "./issue-signature";

const LEARNING_INTERVAL_MS = 90_000;

let learningTimer: ReturnType<typeof setInterval> | null = null;
let lastLearningRun = 0;
let learningRunCount = 0;

export interface LearningReport {
  lastRun: number;
  runCount: number;
  totalFixes: number;
  consolidatedGroups: number;
  highPerformers: number;
  lowPerformers: number;
  disabledFixes: number;
}

export function startLearningCycle(): () => void {
  if (learningTimer) return () => {};

  learningTimer = setInterval(() => {
    void runLearningCycle();
  }, LEARNING_INTERVAL_MS);

  engineObserver.log("engine-learning", "engine-learning", "info",
    `Learning cycle started (interval: ${LEARNING_INTERVAL_MS / 1000}s)`);

  return () => {
    if (learningTimer) {
      clearInterval(learningTimer);
      learningTimer = null;
    }
  };
}

async function runLearningCycle(): Promise<void> {
  learningRunCount++;
  lastLearningRun = Date.now();

  const allFixes = engineMemory.getAllFixes();
  if (allFixes.length === 0) return;

  const mutated = new Set<string>();

  adjustConfidenceScores(allFixes, mutated);
  detectAndDisableIneffective(allFixes);
  promoteHighPerformers(allFixes, mutated);
  consolidateSimilarFixes(allFixes);

  for (const sig of mutated) {
    await engineMemory.persistLearningUpdate(sig);
  }

  engineObserver.log("engine-learning", "engine-learning", "info",
    `Learning cycle #${learningRunCount} completed: ${allFixes.length} fixes analyzed, ${mutated.size} updated`);
}

function adjustConfidenceScores(fixes: EngineMemoryRecord[], mutated: Set<string>): void {
  for (const fix of fixes) {
    if (fix.disabled) continue;

    const totalAttempts = fix.success_count + fix.failure_count;
    if (totalAttempts < 3) continue;

    const successRate = fix.success_count / totalAttempts;

    let targetConfidence: number;
    if (successRate >= 0.9 && fix.recurrence_after_fix === 0) {
      targetConfidence = Math.min(1, fix.confidence + 0.03);
    } else if (successRate >= 0.7) {
      targetConfidence = fix.confidence;
    } else if (successRate >= 0.5) {
      targetConfidence = Math.max(0.3, fix.confidence - 0.02);
    } else {
      targetConfidence = Math.max(0.1, fix.confidence - 0.05);
    }

    if (Math.abs(targetConfidence - fix.confidence) > 0.001) {
      fix.confidence = Math.round(targetConfidence * 1000) / 1000;
      fix.score = engineMemory.computeScore(fix);
      mutated.add(fix.issue_signature);
    }
  }
}

function detectAndDisableIneffective(fixes: EngineMemoryRecord[]): void {
  for (const fix of fixes) {
    if (fix.disabled) continue;

    const totalAttempts = fix.success_count + fix.failure_count;
    if (totalAttempts < 5) continue;

    const successRate = fix.success_count / totalAttempts;
    const highRecurrence = fix.recurrence_after_fix > fix.applied_count * 0.5;

    if (successRate < 0.3 || (highRecurrence && successRate < 0.5)) {
      void engineMemory.toggleFix(fix.issue_signature, false);
      engineObserver.log("engine-learning", "engine-learning", "warn",
        `Disabled ineffective fix: ${fix.issue_signature} ` +
        `(success=${(successRate * 100).toFixed(0)}%, recurrence=${fix.recurrence_after_fix})`);
    }
  }
}

function promoteHighPerformers(fixes: EngineMemoryRecord[], mutated: Set<string>): void {
  for (const fix of fixes) {
    if (fix.disabled || fix.auto_apply) continue;

    const totalAttempts = fix.success_count + fix.failure_count;
    if (totalAttempts < 3) continue;

    const successRate = fix.success_count / totalAttempts;

    if (successRate >= 0.85 && fix.confidence >= 0.7 && fix.recurrence_after_fix === 0) {
      fix.auto_apply = true;
      mutated.add(fix.issue_signature);
      engineObserver.log("engine-learning", "engine-learning", "info",
        `Promoted fix to auto-apply: ${fix.issue_signature} ` +
        `(score=${fix.score}, success=${(successRate * 100).toFixed(0)}%)`);
    }
  }
}

function consolidateSimilarFixes(fixes: EngineMemoryRecord[]): void {
  const groups = new Map<string, EngineMemoryRecord[]>();

  for (const fix of fixes) {
    if (fix.disabled) continue;

    let foundGroup = false;
    for (const [key, group] of groups) {
      if (signaturesAreSimilar(fix.issue_signature, key)) {
        group.push(fix);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      groups.set(fix.issue_signature, [fix]);
    }
  }

  for (const [, group] of groups) {
    if (group.length < 2) continue;

    group.sort((a, b) => b.score - a.score);

    engineObserver.log("engine-learning", "engine-learning", "debug",
      `Similar fix group detected: ${group.length} fixes, ` +
      `best=${group[0].issue_signature} (score=${group[0].score})`);
  }
}

export function getLearningReport(): LearningReport {
  const allFixes = engineMemory.getAllFixes();
  const active = allFixes.filter(f => !f.disabled);

  const groups = new Map<string, EngineMemoryRecord[]>();
  for (const fix of active) {
    let foundGroup = false;
    for (const [key, group] of groups) {
      if (signaturesAreSimilar(fix.issue_signature, key)) {
        group.push(fix);
        foundGroup = true;
        break;
      }
    }
    if (!foundGroup) groups.set(fix.issue_signature, [fix]);
  }

  const highPerformers = active.filter(f => f.score >= 0.8).length;
  const lowPerformers = active.filter(f => f.score < 0.4).length;

  return {
    lastRun: lastLearningRun,
    runCount: learningRunCount,
    totalFixes: allFixes.length,
    consolidatedGroups: Array.from(groups.values()).filter(g => g.length > 1).length,
    highPerformers,
    lowPerformers,
    disabledFixes: allFixes.filter(f => f.disabled).length,
  };
}

export function getFixScoreBreakdown(record: EngineMemoryRecord) {
  const totalAttempts = record.success_count + record.failure_count;
  const successRate = totalAttempts > 0
    ? record.success_count / totalAttempts
    : 0.5;

  const speedScore = record.avg_fix_duration_ms > 0
    ? Math.max(0, 1 - (record.avg_fix_duration_ms / 10000))
    : 0.5;

  const recurrenceScore = record.applied_count > 0
    ? Math.max(0, 1 - (record.recurrence_after_fix / Math.max(1, record.applied_count)))
    : 0.5;

  return {
    successRate: Math.round(successRate * 1000) / 1000,
    speedScore: Math.round(speedScore * 1000) / 1000,
    recurrenceScore: Math.round(recurrenceScore * 1000) / 1000,
    weights: { success: 0.5, speed: 0.2, recurrence: 0.3 },
    finalScore: record.score,
  };
}
