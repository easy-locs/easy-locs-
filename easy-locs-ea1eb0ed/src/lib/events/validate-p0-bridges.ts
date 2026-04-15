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

  // ═══ BRIDGE 1: eta:context_refresh → eta:projections_updated ═══
  {
    const downstream: string[] = [];
    let handlerFired = false;
    const unsub = platformBus.on("eta:projections_updated", () => {
      handlerFired = true;
      downstream.push("eta:projections_updated");
    });

    console.log("[P0-VALIDATION] Emitting eta:context_refresh...");
    platformBus.emit("eta:context_refresh", { zoneKey: "AE_DUBAI_MARINA", contextType: "global" }, "test");

    await new Promise(r => setTimeout(r, 500));
    unsub();

    results.push({
      bridge: "eta:context_refresh",
      emitted: true,
      handlerFired,
      downstreamEvents: downstream,
      pass: handlerFired && downstream.includes("eta:projections_updated"),
    });
  }

  // ═══ BRIDGE 2: merchant:visibility_refresh → merchant:visibility_updated ═══
  {
    const downstream: string[] = [];
    let handlerFired = false;
    const unsub = platformBus.on("merchant:visibility_updated", () => {
      handlerFired = true;
      downstream.push("merchant:visibility_updated");
    });

    console.log("[P0-VALIDATION] Emitting merchant:visibility_refresh...");
    platformBus.emit("merchant:visibility_refresh", { zoneKey: "AE_DUBAI_MARINA" }, "test");

    await new Promise(r => setTimeout(r, 1000));
    unsub();

    results.push({
      bridge: "merchant:visibility_refresh",
      emitted: true,
      handlerFired,
      downstreamEvents: downstream,
      pass: handlerFired && downstream.includes("merchant:visibility_updated"),
    });
  }

  // ═══ BRIDGE 3: commerce:payment_authorized → downstream fan-out ═══
  {
    const downstream: string[] = [];
    const expectedDownstream = [
      "wallet:balance_refresh",
      "order:payment_updated",
      "orbit:payment_context",
      "notification:payment",
    ];
    const unsubs = expectedDownstream.map(evt =>
      platformBus.on(evt, () => { downstream.push(evt); })
    );

    console.log("[P0-VALIDATION] Emitting commerce:payment_authorized via platformBus...");
    platformBus.emit("commerce:payment_authorized", { orderId: "test-order-001", amount: 100, stage: "authorized" }, "wallet");

    await new Promise(r => setTimeout(r, 500));
    unsubs.forEach(u => u());

    results.push({
      bridge: "commerce:payment_authorized",
      emitted: true,
      handlerFired: downstream.length > 0,
      downstreamEvents: downstream,
      pass: expectedDownstream.every(evt => downstream.includes(evt)),
    });
  }

  // ═══ P1 BRIDGE: zone intelligence (demand/supply/traffic/weather) ═══
  {
    const downstream: string[] = [];
    const unsubs = [
      platformBus.on("zone:supply_updated", () => { downstream.push("zone:supply_updated"); }),
      platformBus.on("zone:demand_updated", () => { downstream.push("zone:demand_updated"); }),
      platformBus.on("zone:traffic_updated", () => { downstream.push("zone:traffic_updated"); }),
      platformBus.on("zone:weather_updated", () => { downstream.push("zone:weather_updated"); }),
      platformBus.on("zone:weather_safety_updated", () => { downstream.push("zone:weather_safety_updated"); }),
      platformBus.on("zone:pressure_updated", () => { downstream.push("zone:pressure_updated"); }),
    ];

    const mockStation = {
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
      weather_type: "rain",
      weather_intensity: 0.6,
      flood_risk_level: "moderate",
      avg_food_eta_minutes: 25,
      avg_grocery_eta_minutes: 30,
      avg_taxi_eta_minutes: 8,
      avg_parcel_eta_minutes: 35,
      updated_at: new Date().toISOString(),
    };

    console.log("[P1-VALIDATION] Emitting eta:projections_updated with weather mock...");
    platformBus.emit("eta:projections_updated", {
      zoneKey: "AE_DUBAI_MARINA",
      station: mockStation,
      etas: { food: 25, grocery: 30, taxi: 8, parcel: 35 },
      updatedAt: new Date().toISOString(),
    }, "test");

    await new Promise(r => setTimeout(r, 300));
    unsubs.forEach(u => u());

    results.push({
      bridge: "zone-intelligence (P1 — supply/demand/traffic/weather)",
      emitted: true,
      handlerFired: downstream.length > 0,
      downstreamEvents: downstream,
      pass: downstream.includes("zone:supply_updated") &&
            downstream.includes("zone:demand_updated") &&
            downstream.includes("zone:traffic_updated") &&
            downstream.includes("zone:weather_updated") &&
            downstream.includes("zone:weather_safety_updated") &&
            downstream.includes("zone:pressure_updated"),
    });
  }

  // ═══ P2 BRIDGE: experience consumer ═══
  {
    const downstream: string[] = [];
    const unsubs = [
      platformBus.on("experience:suggestions_updated", () => { downstream.push("experience:suggestions_updated"); }),
      platformBus.on("experience:trending_updated", () => { downstream.push("experience:trending_updated"); }),
      platformBus.on("experience:prompts_updated", () => { downstream.push("experience:prompts_updated"); }),
    ];

    console.log("[P2-VALIDATION] Emitting zone:pressure_updated with experience mock...");
    platformBus.emit("zone:pressure_updated", {
      zoneKey: "AE_DUBAI_MARINA",
      pressureScore: 72,
      supply: { riderCount: 3, isLow: true, factor: 0.6 },
      demand: { level: 75, multiplier: 1.5, isHigh: true, surgeActive: true, surgeMultiplier: 1.3 },
      traffic: { level: "heavy", speedFactor: 0.5, isSevere: false },
      weather: { type: "rain", intensity: 0.6, isStorm: false },
      safety: { floodRisk: "moderate", isBlocked: false },
      merchants: { total: 20, open: 15, deliverable: 12 },
      updatedAt: new Date().toISOString(),
    }, "test");

    await new Promise(r => setTimeout(r, 300));
    unsubs.forEach(u => u());

    results.push({
      bridge: "experience-consumer (P2 — suggestions/trending/prompts)",
      emitted: true,
      handlerFired: downstream.length > 0,
      downstreamEvents: downstream,
      pass: downstream.includes("experience:suggestions_updated") &&
            downstream.includes("experience:trending_updated") &&
            downstream.includes("experience:prompts_updated"),
    });
  }

  console.log("\n═══ BRIDGE VALIDATION RESULTS (P0 + P1 + P2) ═══");
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

if (typeof window !== "undefined") {
  (window as any).__validateP0Bridges = validateP0Bridges;
}
