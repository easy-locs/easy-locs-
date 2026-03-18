/**
 * Supply Analyzer — Evaluate available driver supply from a driver list.
 */

export interface SupplyStats {
  total: number;
  available: number;
  busy: number;
  ratio: number; // available / total
}

export function analyzeSupply(drivers: Array<{ status: string }>): SupplyStats {
  const available = drivers.filter(d => d.status === "available" || d.status === "online");
  const busy = drivers.filter(d => d.status === "busy" || d.status === "arriving");

  return {
    total: drivers.length,
    available: available.length,
    busy: busy.length,
    ratio: drivers.length > 0 ? available.length / drivers.length : 0,
  };
}
