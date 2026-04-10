import { platformBus } from "@/lib/shared/platform-bus";

let initialized = false;

export function initRealEstateEngines(): void {
  if (initialized) return;
  initialized = true;

  platformBus.on("rent.paid", (_payload) => {
    platformBus.emit("automation.action.generate_receipt", _payload);
  });

  platformBus.on("lease.generated", (_payload) => {
    platformBus.emit("automation.action.compliance_check", _payload);
  });

  platformBus.on("rent.partial_payment", (_payload) => {
    platformBus.emit("orbit.notify", {
      userId: (_payload as Record<string, unknown>).landlordId,
      type: "partial_payment",
      title: "Partial rent payment received",
      body: `Partial payment for ${(_payload as Record<string, unknown>).period}`,
      data: _payload,
    });
  });

  platformBus.on("compliance.report_generated", (_payload) => {
    const data = _payload as Record<string, unknown>;
    if (data.overallStatus === "non_compliant") {
      platformBus.emit("orbit.notify", {
        userId: data.landlordId,
        type: "compliance_alert",
        title: "Property compliance issue",
        body: `${data.missingCount} missing document(s) for property`,
        data,
      });
    }
  });

  platformBus.on("receipt.generated", (_payload) => {
    const data = _payload as Record<string, unknown>;
    platformBus.emit("orbit.notify", {
      userId: data.tenantId,
      type: "receipt_available",
      title: "Rent receipt available",
      body: `Receipt ${data.receiptNumber} for ${data.period}`,
      data,
    });
  });

  platformBus.emit("engines.real_estate.initialized", {
    engines: [
      "lease-generator",
      "rent-call",
      "rent-receipt",
      "rent-payment",
      "legal-engine",
    ],
    timestamp: Date.now(),
  });
}
