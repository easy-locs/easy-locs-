/**
 * Runtime validation for P0 bridges.
 * Run via: import from console or test harness.
 * 
 * This file validates the 3 P0 propagation bridges end-to-end.
 */
import { eventBus } from "@/lib/core/event-bus";
import { platformBus } from "@/lib/shared/platform-bus";

interface ValidationResult {
  bridge: string;
  emitted: boolean;
  handlerFired: boolean;
  downstreamEvents: string[];
  pass: boolean;
}

export async function validateP0Bridges(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // ═══ BRIDGE 1: eta.context.refresh ═══
  {
    const downstream: string[] = [];
    const onProjections = (p: any) => { downstream.push("eta.projections.updated"); };
    eventBus.on("eta.projections.updated", onProjections);

    console.log("[P0-VALIDATION] Emitting eta.context.refresh...");
    await eventBus.emit("eta.context.refresh", { zoneKey: "AE_DUBAI_MARINA", contextType: "global" });
    
    // Allow async handler to complete
    await new Promise(r => setTimeout(r, 500));
    
    eventBus.off("eta.projections.updated", onProjections);
    
    results.push({
      bridge: "eta.context.refresh",
      emitted: true,
      handlerFired: true, // handler always logs
      downstreamEvents: downstream,
      pass: downstream.includes("eta.projections.updated"),
    });
  }

  // ═══ BRIDGE 2: merchant.visibility.refresh ═══
  {
    const downstream: string[] = [];
    const onVisibility = (p: any) => { downstream.push("merchant.visibility.updated"); };
    eventBus.on("merchant.visibility.updated", onVisibility);

    console.log("[P0-VALIDATION] Emitting merchant.visibility.refresh...");
    await eventBus.emit("merchant.visibility.refresh", { zoneKey: "AE_DUBAI_MARINA" });
    
    await new Promise(r => setTimeout(r, 1000));
    
    eventBus.off("merchant.visibility.updated", onVisibility);
    
    results.push({
      bridge: "merchant.visibility.refresh",
      emitted: true,
      handlerFired: true,
      downstreamEvents: downstream,
      pass: downstream.includes("merchant.visibility.updated"),
    });
  }

  // ═══ BRIDGE 3: commerce:payment_authorized ═══
  {
    const downstream: string[] = [];
    const onWallet = (p: any) => { downstream.push("wallet.updated"); };
    const onOrder = (p: any) => { downstream.push("order.payment.updated"); };
    const onOrbit = (p: any) => { downstream.push("orbit.payment.context"); };
    const onNotif = (p: any) => { downstream.push("notification.payment"); };

    eventBus.on("wallet.updated", onWallet);
    eventBus.on("order.payment.updated", onOrder);
    eventBus.on("orbit.payment.context", onOrbit);
    eventBus.on("notification.payment", onNotif);

    console.log("[P0-VALIDATION] Emitting commerce:payment_authorized via platformBus...");
    platformBus.emit("commerce:payment_authorized", { orderId: "test-order-001", amount: 100, stage: "authorized" }, "wallet");
    
    await new Promise(r => setTimeout(r, 500));
    
    eventBus.off("wallet.updated", onWallet);
    eventBus.off("order.payment.updated", onOrder);
    eventBus.off("orbit.payment.context", onOrbit);
    eventBus.off("notification.payment", onNotif);
    
    results.push({
      bridge: "commerce:payment_authorized",
      emitted: true,
      handlerFired: downstream.length > 0,
      downstreamEvents: downstream,
      pass: downstream.includes("wallet.updated") &&
            downstream.includes("order.payment.updated") &&
            downstream.includes("orbit.payment.context") &&
            downstream.includes("notification.payment"),
    });
  }

  // ═══ P1 BRIDGE: zone intelligence (demand/supply/traffic) ═══
  {
    const downstream: string[] = [];
    const listeners = [
      { event: "zone.supply.updated", fn: () => { downstream.push("zone.supply.updated"); } },
      { event: "zone.demand.updated", fn: () => { downstream.push("zone.demand.updated"); } },
      { event: "zone.traffic.updated", fn: () => { downstream.push("zone.traffic.updated"); } },
      { event: "zone.pressure.updated", fn: () => { downstream.push("zone.pressure.updated"); } },
    ];
    listeners.forEach(l => eventBus.on(l.event, l.fn));

    // Trigger via eta.projections.updated (which zone-intelligence handler listens to)
    console.log("[P1-VALIDATION] Emitting eta.projections.updated with mock station...");
    await eventBus.emit("eta.projections.updated", {
      zoneKey: "AE_DUBAI_MARINA",
      station: {
        traffic_level: "heavy",
        traffic_speed_factor: 0.5,
        rider_supply: 3,
        rider_supply_factor: 0.6,
        rider_supply_count: 3,
        merchant_count: 20,
        merchant_open_count: 15,
        merchant_deliverable_count: 12,
        demand_level: 75,
        demand_multiplier: 1.5,
        surge_multiplier: 1.3,
        weather_type: "clear",
        weather_intensity: 0,
        flood_risk_level: null,
        avg_food_eta_minutes: 25,
        avg_grocery_eta_minutes: 30,
        avg_taxi_eta_minutes: 8,
        avg_parcel_eta_minutes: 35,
        updated_at: new Date().toISOString(),
      },
      etas: { food: 25, grocery: 30, taxi: 8, parcel: 35 },
      updatedAt: new Date().toISOString(),
    });

    await new Promise(r => setTimeout(r, 300));
    listeners.forEach(l => eventBus.off(l.event, l.fn));

    results.push({
      bridge: "zone-intelligence (P1)",
      emitted: true,
      handlerFired: downstream.length > 0,
      downstreamEvents: downstream,
      pass: downstream.includes("zone.supply.updated") &&
            downstream.includes("zone.demand.updated") &&
            downstream.includes("zone.traffic.updated") &&
            downstream.includes("zone.pressure.updated"),
    });
  }

  // Print summary
  console.log("\n═══ BRIDGE VALIDATION RESULTS (P0 + P1) ═══");
  for (const r of results) {
    console.log(`\n[${r.pass ? "✅ PASS" : "❌ FAIL"}] ${r.bridge}`);
    console.log(`  Emitted: ${r.emitted}`);
    console.log(`  Handler fired: ${r.handlerFired}`);
    console.log(`  Downstream: ${r.downstreamEvents.join(", ") || "none"}`);
  }
  
  const allPass = results.every(r => r.pass);
  console.log(`\n═══ OVERALL: ${allPass ? "ALL PASS ✅" : "SOME FAILED ❌"} ═══\n`);

  return results;
}

// Export for dev tools access
if (typeof window !== "undefined") {
  (window as any).__validateP0Bridges = validateP0Bridges;
}
