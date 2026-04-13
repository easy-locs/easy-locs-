import { platformBus } from "@/lib/shared/platform-bus";

let initialized = false;
let teardownFn: (() => void) | null = null;

export function initRealEstateEngines(): () => void {
  if (initialized) return teardownFn ?? (() => {});
  initialized = true;

  const unsubs: Array<() => void> = [];

  unsubs.push(platformBus.on("pm:payment_received", (event) => {
    const data = event.payload as Record<string, unknown>;
    const paymentId = (data.paymentId as string) ?? "";
    const amount = (data.amount as number) ?? 0;
    const currency = (data.currency as string) ?? "AED";
    const leaseId = (data.leaseId as string) ?? "";
    const status = (data.status as string) ?? "pending";
    const isFull = data.full === true;

    if (status === "paid" || isFull) {
      const receiptNumber = `RCPT-${paymentId.replace("rent_", "")}`;
      platformBus.emit("wallet:receipt_generated", {
        receiptNumber,
        paymentId,
        amount,
        currency,
        leaseId,
        tenantId: data.tenantOrbitId ?? data.tenantId,
        landlordId: data.ownerOrbitId ?? data.landlordId,
        period: data.period ?? new Date().toISOString().slice(0, 7),
        generatedAt: new Date().toISOString(),
      }, "pm");
    } else {
      platformBus.emit("notification:created", {
        userId: data.ownerOrbitId ?? data.landlordId,
        type: "rent_payment_pending",
        title: "Rent payment recorded",
        body: `Payment of ${amount} ${currency} for lease ${leaseId} is ${status}`,
        data: { paymentId, amount, currency, leaseId, status },
      }, "pm");
    }
  }));

  unsubs.push(platformBus.on("pm:lease_created", (event) => {
    const data = event.payload as Record<string, unknown>;
    platformBus.emit("notification:created", {
      userId: data.tenantId,
      type: "lease_created",
      title: "New lease agreement",
      body: `Lease created for property ${data.propertyId}`,
      data: { leaseId: data.leaseId, propertyId: data.propertyId },
    }, "pm");
  }));

  unsubs.push(platformBus.on("wallet:receipt_generated", (event) => {
    const data = event.payload as Record<string, unknown>;
    if (!data.tenantId || !data.receiptNumber) return;
    platformBus.emit("notification:created", {
      userId: data.tenantId,
      type: "receipt_available",
      title: "Rent receipt available",
      body: `Receipt ${data.receiptNumber} for ${data.period ?? "current period"}`,
      data: { receiptNumber: data.receiptNumber, period: data.period },
    }, "wallet");
  }));

  platformBus.emit("system:module_status_changed", {
    module: "real-estate-engines",
    status: "online",
    engines: [
      "lease-generator",
      "rent-call",
      "rent-receipt",
      "rent-payment",
      "legal-engine",
    ],
    timestamp: Date.now(),
  }, "system");

  teardownFn = () => {
    for (const u of unsubs) {
      try { u(); } catch {}
    }
    initialized = false;
    teardownFn = null;
  };

  return teardownFn;
}
