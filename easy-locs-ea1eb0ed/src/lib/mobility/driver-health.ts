export type DriverRealtimeHealth = "ok" | "weak" | "lost";

export function detectDriverStall(lastUpdate: number): DriverRealtimeHealth {
  if (!lastUpdate) return "lost";

  const delta = Date.now() - lastUpdate;

  if (delta > 40000) return "lost";
  if (delta > 20000) return "weak";
  return "ok";
}
