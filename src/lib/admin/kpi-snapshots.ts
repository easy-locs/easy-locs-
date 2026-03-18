/**
 * KPI snapshots — placeholder for chart-ready data.
 * Returns mock snapshots until a real kpi_snapshots table exists.
 */

export async function listKpiSnapshots(_workspaceId: string) {
  // Generate last 7 days of mock data for chart rendering
  const now = new Date();
  const rows = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    rows.push({
      snapshot_date: d.toISOString().slice(0, 10),
      orders_count: Math.floor(20 + Math.random() * 80),
      gross_revenue: Math.floor(500 + Math.random() * 3000),
      active_drivers: Math.floor(5 + Math.random() * 20),
      active_merchants: Math.floor(3 + Math.random() * 15),
    });
  }
  return rows;
}
