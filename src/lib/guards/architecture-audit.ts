/**
 * ARCHITECTURE AUDIT — Sprint 6 Violation Detector
 * ==================================================
 * Runtime audit that detects canonical violations.
 * Run in DEV mode to surface legacy leaks and bypass patterns.
 */

export interface AuditViolation {
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  file?: string;
}

/**
 * Run a full architecture audit and return violations.
 * This is a runtime check — not a static analysis tool.
 */
export function runArchitectureAudit(): AuditViolation[] {
  const violations: AuditViolation[] = [];

  // 1. Check DOM for hardcoded English in critical UI elements
  if (typeof document !== "undefined") {
    const buttons = document.querySelectorAll("button, [role='button']");
    const hardcodedPatterns = /^(Submit|Cancel|Save|Delete|Loading\.\.\.|Error|Back|Next|Search|Close)$/;
    buttons.forEach((btn) => {
      const text = btn.textContent?.trim();
      if (text && hardcodedPatterns.test(text)) {
        violations.push({
          severity: "warning",
          category: "i18n",
          message: `Hardcoded button text: "${text}"`,
        });
      }
    });
  }

  // 2. Check for legacy realtime subscriptions
  if (typeof window !== "undefined" && (window as any).__supabaseChannels) {
    const channels = (window as any).__supabaseChannels as string[];
    channels.forEach((ch) => {
      if (ch.includes("messages") && !ch.includes("chat_messages_v2")) {
        violations.push({
          severity: "critical",
          category: "orbit-legacy",
          message: `Legacy realtime channel detected: "${ch}". Direct messaging must use chat_messages_v2.`,
        });
      }
    });
  }

  // 3. Check for orphan routes in current path
  if (typeof window !== "undefined") {
    const path = window.location.hash?.replace("#", "") || window.location.pathname;
    const deadPatterns = ["/explore", "/map", "/dispatch", "/growth", "/dino"];
    deadPatterns.forEach((dead) => {
      if (path.startsWith(dead)) {
        violations.push({
          severity: "critical",
          category: "navigation",
          message: `Dead route accessed: "${dead}". Should redirect to canonical equivalent.`,
        });
      }
    });
  }

  return violations;
}

/**
 * Print audit results to console in dev mode.
 */
export function printAuditReport(violations: AuditViolation[]): void {
  if (!import.meta.env.DEV) return;

  const critical = violations.filter((v) => v.severity === "critical");
  const warnings = violations.filter((v) => v.severity === "warning");

  if (violations.length === 0) {
    console.log("%c✅ Architecture audit: CLEAN", "color: #22c55e; font-weight: bold");
    return;
  }

  console.group(
    `%c⚠️ Architecture Audit: ${critical.length} critical, ${warnings.length} warnings`,
    "color: #f59e0b; font-weight: bold"
  );
  violations.forEach((v) => {
    const color = v.severity === "critical" ? "#ef4444" : v.severity === "warning" ? "#f59e0b" : "#6b7280";
    console.log(`%c[${v.severity.toUpperCase()}] ${v.category}: ${v.message}`, `color: ${color}`);
  });
  console.groupEnd();
}
