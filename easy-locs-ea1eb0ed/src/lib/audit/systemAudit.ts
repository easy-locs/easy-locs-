/**
 * systemAudit.ts — Runtime diagnostic for key platform flows.
 * Call from dev console: import('/src/lib/audit/systemAudit.ts').then(m => m.runSystemAudit({...}))
 */

export interface AuditInput {
  user?: { id?: string; orbit_id?: string; email?: string };
  radarLocation?: { lat?: number; lng?: number };
  paymentTarget?: { id?: string; type?: string };
}

export interface AuditResult {
  domain: string;
  status: "ok" | "warn" | "error";
  message: string;
}

export function runSystemAudit(input: AuditInput): AuditResult[] {
  const results: AuditResult[] = [];

  const push = (domain: string, status: AuditResult["status"], message: string) => {
    results.push({ domain, status, message });
    const icon = status === "ok" ? "✅" : status === "warn" ? "⚠️" : "❌";
    const method = status === "error" ? "error" : status === "warn" ? "warn" : "log";
    console[method](`${icon} [${domain}] ${message}`);
  };

  console.log("=== SYSTEM AUDIT START ===");

  // ── Identity ──
  if (!input.user?.id) {
    push("Identity", "error", "user.id missing — auth not initialized");
  } else {
    push("Identity", "ok", `user.id = ${input.user.id}`);
  }

  if (!input.user?.orbit_id) {
    push("Orbit", "warn", "orbit_id missing — profile may not be synced");
  } else {
    push("Orbit", "ok", `orbit_id = ${input.user.orbit_id}`);
  }

  // ── Geolocation ──
  if (!input.radarLocation?.lat || !input.radarLocation?.lng) {
    push("Geolocation", "error", "GPS coordinates missing — radar/map will be empty");
  } else {
    push("Geolocation", "ok", `lat=${input.radarLocation.lat}, lng=${input.radarLocation.lng}`);
  }

  // ── Payment Target ──
  if (!input.paymentTarget?.id) {
    push("Payment", "error", "payment target not resolved");
  } else {
    push("Payment", "ok", `target.id = ${input.paymentTarget.id}`);
  }

  console.log("=== SYSTEM AUDIT END ===");
  return results;
}
