import { isOperationAllowed, isDomainOperationAllowed, hasDomainActivationSheet } from "./repair-safety";
import type { MutationRecord } from "./proof-system";
import {
  findVerticalClipping,
  findTextClipping,
  findElementOverlaps,
  findStranglingWrappers,
} from "@/lib/ui-engine/detectors";
import { findTinyTapTargets, findDottedLabels, findUntranslatedKeys, titleize } from "@/lib/ui-engine/utils";
import { findBrokenCards } from "@/lib/ui-engine/utils";
import { runTextAudit, autoFixTextFindings } from "@/lib/ui-engine/textAudit";
import { safeSetOuterHtml } from "@/lib/utils/sanitize-html";

export type RepairOperationType = "invalidate" | "refresh" | "reset" | "reconnect" | "fallback" | "suppress";

const FINANCIAL_DOMAINS = new Set([
  "wallet", "payment", "billing", "settlement", "ledger", "fraud",
]);

const FORBIDDEN_DOM_SELECTORS = [
  "form[data-auth]",
  "[data-payment-form]",
  "[data-wallet-form]",
  "[role='dialog']",
  "[data-modal]",
  "[data-overlay]",
];

const MAX_DOM_MUTATIONS_PER_RUN = 10;
let domMutationCount = 0;

const domSnapshotMap = new WeakMap<HTMLElement, string>();

export function resetDomMutationCount(): void {
  domMutationCount = 0;
}

export function getDomMutationCount(): number {
  return domMutationCount;
}

export interface RepairActionResult {
  success: boolean;
  operation: RepairOperationType;
  target: string;
  mutation: MutationRecord | null;
  error: string | null;
  rollbackFn: (() => void) | null;
}

interface ActionState {
  key: string;
  beforeValue: string;
  afterValue: string;
  restoredValue: string | null;
}

const actionHistory: ActionState[] = [];
const MAX_ACTION_HISTORY = 500;

function isDomTarget(target: string): boolean {
  return target.startsWith("el-ui-") || target.startsWith("el-text-") || target.startsWith("el-i18n-") || target.startsWith("el-layout-");
}

function isElementSafeForRepair(el: HTMLElement): boolean {
  if (!el.closest("#root")) return false;
  if (el.hasAttribute("data-repair-frozen")) return false;
  if (el.closest("head") || el.closest("script")) return false;
  for (const selector of FORBIDDEN_DOM_SELECTORS) {
    if (el.matches(selector) || el.closest(selector)) return false;
  }
  return true;
}

function canMutateDom(): boolean {
  return domMutationCount < MAX_DOM_MUTATIONS_PER_RUN;
}

function recordDomSnapshot(el: HTMLElement): void {
  if (!domSnapshotMap.has(el)) {
    domSnapshotMap.set(el, el.outerHTML);
  }
}

function restoreDomSnapshot(el: HTMLElement): boolean {
  const snapshot = domSnapshotMap.get(el);
  if (snapshot) {
    safeSetOuterHtml(el, snapshot);
    return true;
  }
  return false;
}

function captureState(target: string): string {
  if (isDomTarget(target)) {
    return "[dom-target]";
  }
  try {
    const val = localStorage.getItem(target);
    return val ?? "[empty]";
  } catch {
    return "[unreadable]";
  }
}

function recordActionState(state: ActionState): void {
  actionHistory.push(state);
  if (actionHistory.length > MAX_ACTION_HISTORY) {
    actionHistory.splice(0, actionHistory.length - MAX_ACTION_HISTORY);
  }
}

export function canExecuteRepair(domain: string, operation: string): { allowed: boolean; reason: string } {
  if (FINANCIAL_DOMAINS.has(domain)) {
    return { allowed: false, reason: `Financial domain "${domain}" permanently blocked from automated repair` };
  }

  if (!isOperationAllowed(operation)) {
    return { allowed: false, reason: `Operation "${operation}" not in global allowlist` };
  }

  if (hasDomainActivationSheet(domain)) {
    if (!isDomainOperationAllowed(domain, operation)) {
      return { allowed: false, reason: `Operation "${operation}" not allowed by domain activation sheet for "${domain}"` };
    }
  }

  return { allowed: true, reason: "ok" };
}

export function executeRepairAction(
  operation: RepairOperationType,
  target: string,
  domain: string,
): RepairActionResult {
  const check = canExecuteRepair(domain, operation);
  if (!check.allowed) {
    return {
      success: false,
      operation,
      target,
      mutation: null,
      error: check.reason,
      rollbackFn: null,
    };
  }

  if (isDomTarget(target)) {
    return executeDomRepairAction(operation, target, domain);
  }

  const beforeState = captureState(target);
  const appliedAt = Date.now();

  try {
    const executor = OPERATION_EXECUTORS[operation];
    executor(target);
  } catch (err) {
    return {
      success: false,
      operation,
      target,
      mutation: null,
      error: err instanceof Error ? err.message : String(err),
      rollbackFn: null,
    };
  }

  const afterState = captureState(target);

  const actionState: ActionState = {
    key: target,
    beforeValue: beforeState,
    afterValue: afterState,
    restoredValue: null,
  };
  recordActionState(actionState);

  const mutation: MutationRecord = {
    operation,
    target,
    beforeState,
    afterState,
    appliedAt,
    rolledBackAt: null,
  };

  const rollbackFn = createRollbackFn(target, beforeState, mutation, actionState);

  return {
    success: true,
    operation,
    target,
    mutation,
    error: null,
    rollbackFn,
  };
}

function executeDomRepairAction(
  operation: RepairOperationType,
  target: string,
  _domain: string,
): RepairActionResult {
  if (typeof document === "undefined") {
    return { success: false, operation, target, mutation: null, error: "No DOM available (SSR)", rollbackFn: null };
  }

  if (!canMutateDom()) {
    return { success: false, operation, target, mutation: null, error: `DOM mutation cap reached (${MAX_DOM_MUTATIONS_PER_RUN})`, rollbackFn: null };
  }

  const appliedAt = Date.now();
  const patchedElements: HTMLElement[] = [];
  let beforeHtml = "";
  let afterHtml = "";

  try {
    const executor = DOM_REPAIR_EXECUTORS[target];
    if (!executor) {
      return { success: false, operation, target, mutation: null, error: `No DOM repair executor for target "${target}"`, rollbackFn: null };
    }

    const result = executor();
    patchedElements.push(...result.elements);
    beforeHtml = result.beforeHtml;
    afterHtml = result.afterHtml;

    if (patchedElements.length === 0) {
      return { success: false, operation, target, mutation: null, error: "No eligible DOM elements found to patch", rollbackFn: null };
    }
  } catch (err) {
    return { success: false, operation, target, mutation: null, error: err instanceof Error ? err.message : String(err), rollbackFn: null };
  }

  const mutation: MutationRecord = {
    operation,
    target,
    beforeState: beforeHtml,
    afterState: afterHtml,
    appliedAt,
    rolledBackAt: null,
  };

  const actionState: ActionState = {
    key: target,
    beforeValue: beforeHtml,
    afterValue: afterHtml,
    restoredValue: null,
  };
  recordActionState(actionState);

  const snapshotElements = [...patchedElements];
  const rollbackFn = () => {
    for (const el of snapshotElements) {
      try {
        restoreDomSnapshot(el);
      } catch {}
    }
    mutation.rolledBackAt = Date.now();
    actionState.restoredValue = beforeHtml;
  };

  return { success: true, operation, target, mutation, error: null, rollbackFn };
}

interface DomRepairResult {
  elements: HTMLElement[];
  beforeHtml: string;
  afterHtml: string;
}

function querySafeElements(selector: string): HTMLElement[] {
  if (typeof document === "undefined") return [];
  const root = document.getElementById("root");
  if (!root) return [];
  return Array.from(root.querySelectorAll(selector))
    .filter((el): el is HTMLElement => el instanceof HTMLElement && isElementSafeForRepair(el));
}

function getSafeRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById("root");
}

function filterSafe(elements: HTMLElement[]): HTMLElement[] {
  return elements.filter(el => isElementSafeForRepair(el));
}

function patchWithCap(
  elements: HTMLElement[],
  patchFn: (el: HTMLElement) => void,
): DomRepairResult {
  const patched: HTMLElement[] = [];
  const befores: string[] = [];
  const afters: string[] = [];

  for (const el of elements) {
    if (!canMutateDom()) break;
    recordDomSnapshot(el);
    befores.push(el.outerHTML);
    patchFn(el);
    afters.push(el.outerHTML);
    patched.push(el);
    domMutationCount++;
  }

  return { elements: patched, beforeHtml: befores.join("\n"), afterHtml: afters.join("\n") };
}

const DOM_REPAIR_EXECUTORS: Record<string, () => DomRepairResult> = {
  "el-ui-dom-patches"() {
    const root = getSafeRoot();
    if (!root) return { elements: [], beforeHtml: "", afterHtml: "" };
    const clipped = filterSafe([...findVerticalClipping(root), ...findTextClipping(root)]);
    return patchWithCap(clipped, (el) => {
      el.style.overflow = "visible";
      el.style.textOverflow = "unset";
    });
  },

  "el-ui-tap-targets"() {
    const root = getSafeRoot();
    if (!root) return { elements: [], beforeHtml: "", afterHtml: "" };
    const tiny = filterSafe(findTinyTapTargets(40).filter(el => root.contains(el)));
    return patchWithCap(tiny, (el) => {
      el.style.minWidth = "40px";
      el.style.minHeight = "40px";
    });
  },

  "el-text-integrity"() {
    const root = getSafeRoot();
    if (!root) return { elements: [], beforeHtml: "", afterHtml: "" };

    const findings = runTextAudit(root);
    const safeFindings = findings.filter(f =>
      canMutateDom() && f.autoFixable && f.element instanceof HTMLElement && isElementSafeForRepair(f.element)
    );

    const patched: HTMLElement[] = [];
    const befores: string[] = [];
    const afters: string[] = [];

    for (const f of safeFindings) {
      if (!canMutateDom()) break;
      recordDomSnapshot(f.element);
      befores.push(f.element.outerHTML);
    }

    const fixedCount = autoFixTextFindings(safeFindings.slice(0, MAX_DOM_MUTATIONS_PER_RUN - domMutationCount));

    for (const f of safeFindings.slice(0, fixedCount)) {
      afters.push(f.element.outerHTML);
      patched.push(f.element);
    }
    domMutationCount += fixedCount;

    return { elements: patched, beforeHtml: befores.join("\n"), afterHtml: afters.join("\n") };
  },

  "el-text-encoding"() {
    const root = getSafeRoot();
    if (!root) return { elements: [], beforeHtml: "", afterHtml: "" };
    const encodingPattern = /[\ufffd\u0000-\u0008\u000b\u000c\u000e-\u001f]/;

    const textEls = filterSafe(
      Array.from(root.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6, label, a"))
        .filter((el): el is HTMLElement => el instanceof HTMLElement && encodingPattern.test(el.textContent ?? ""))
    );

    return patchWithCap(textEls, (el) => {
      el.textContent = (el.textContent ?? "").replace(/[\ufffd\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
    });
  },

  "el-i18n-patches"() {
    const root = getSafeRoot();
    if (!root) return { elements: [], beforeHtml: "", afterHtml: "" };
    const dotted = filterSafe(findDottedLabels(root));
    const untranslated = filterSafe(findUntranslatedKeys(root));
    const combined = [...new Set([...dotted, ...untranslated])];

    return patchWithCap(combined, (el) => {
      el.textContent = titleize((el.textContent ?? "").trim());
    });
  },

  "el-layout-cards"() {
    const root = getSafeRoot();
    if (!root) return { elements: [], beforeHtml: "", afterHtml: "" };
    const selectors = ["[data-card='merchant']", "[data-card='listing']", ".merchant-card", ".restaurant-card"];
    const cards = filterSafe(findBrokenCards(selectors).filter(el => root.contains(el)));

    return patchWithCap(cards, (card) => {
      card.style.minHeight = "120px";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.gap = "8px";
      card.style.overflow = "hidden";
      card.style.borderRadius = card.style.borderRadius || "16px";
      card.style.padding = card.style.padding || "12px";
    });
  },

  "el-layout-overlaps"() {
    const root = getSafeRoot();
    if (!root) return { elements: [], beforeHtml: "", afterHtml: "" };

    const strangled = filterSafe(findStranglingWrappers(root));
    if (strangled.length > 0 && import.meta.env.DEV) {
      console.log(`[repair-actions] detect-only: found ${strangled.length} strangling wrapper(s) — no mutation applied (Phase A)`);
    }

    const overlaps = findElementOverlaps(root);
    const safeOverlaps = overlaps.filter(o => isElementSafeForRepair(o.b));

    const patched: HTMLElement[] = [];
    const befores: string[] = [];
    const afters: string[] = [];

    for (const { a, b } of safeOverlaps) {
      if (!canMutateDom()) break;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const overlapY = ra.bottom - rb.top;
      if (overlapY > 0 && overlapY < 40) {
        recordDomSnapshot(b);
        befores.push(b.outerHTML);
        b.style.marginTop = `${Math.ceil(overlapY + 4)}px`;
        afters.push(b.outerHTML);
        patched.push(b);
        domMutationCount++;
      }
    }

    return { elements: patched, beforeHtml: befores.join("\n"), afterHtml: afters.join("\n") };
  },
};

function createRollbackFn(
  target: string,
  beforeState: string,
  mutation: MutationRecord,
  actionState: ActionState,
): () => void {
  return () => {
    try {
      if (beforeState === "[empty]") {
        localStorage.removeItem(target);
      } else if (beforeState !== "[unreadable]") {
        localStorage.setItem(target, beforeState);
      }
      mutation.rolledBackAt = Date.now();
      actionState.restoredValue = beforeState;
    } catch {}
  };
}

const OPERATION_EXECUTORS: Record<RepairOperationType, (target: string) => void> = {
  invalidate(target: string) {
    if (isDomTarget(target)) return;
    try {
      localStorage.removeItem(target);
    } catch {}
  },

  refresh(target: string) {
    if (isDomTarget(target)) return;
    try {
      const current = localStorage.getItem(target);
      if (current) {
        const parsed = JSON.parse(current);
        if (parsed && typeof parsed === "object" && "timestamp" in parsed) {
          parsed.timestamp = Date.now();
          parsed._refreshed = true;
          localStorage.setItem(target, JSON.stringify(parsed));
        }
      }
    } catch {}
  },

  reset(target: string) {
    if (isDomTarget(target)) return;
    try {
      localStorage.removeItem(target);
    } catch {}
  },

  reconnect(_target: string) {
  },

  fallback(_target: string) {
  },

  suppress(_target: string) {
  },
};

export function getActionHistory(): ActionState[] {
  return [...actionHistory];
}

export function getActionHistorySize(): number {
  return actionHistory.length;
}
