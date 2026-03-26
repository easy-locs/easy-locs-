export function detectDriverStall(lastUpdate: number): "ok" | "weak" | "lost" {
  if (!lastUpdate) return "lost";
  const delta = Date.now() - lastUpdate;

  if (delta > 40000) return "lost";
  if (delta > 20000) return "weak";
  return "ok";
}
