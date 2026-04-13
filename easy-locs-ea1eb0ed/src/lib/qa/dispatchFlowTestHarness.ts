import { db } from "@/services/db";

export async function runDispatchFlowSmokeTest() {
  const report: Array<{ step: string; ok: boolean; message: string }> = [];

  try {
    const { data: drivers, error: driverErr } = await db
      .from("driver_profiles")
      .select("id,user_id,is_online,is_available")
      .limit(20);

    if (driverErr) throw driverErr;

    const online = (drivers ?? []).filter((d: any) => d.is_online).length;
    const available = (drivers ?? []).filter((d: any) => d.is_online && d.is_available).length;

    report.push({
      step: "driver-check",
      ok: true,
      message: `${online} online / ${available} available drivers`,
    });

    const { data: orders, error: orderErr } = await db
      .from("orders")
      .select("id,status")
      .in("status", ["ready_for_pickup", "driver_search", "driver_assigned", "on_the_way"])
      .limit(20);

    if (orderErr) throw orderErr;

    report.push({
      step: "dispatchable-orders",
      ok: true,
      message: `${orders?.length ?? 0} live dispatch orders found`,
    });
  } catch (e: any) {
    report.push({ step: "fatal", ok: false, message: e.message || "Dispatch smoke test failed" });
  }

  return report;
}
