import { useEffect, useState } from "react";

export function useKpiChartData(workspaceId?: string) {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!workspaceId) return;
    import("@/lib/admin/kpi-snapshots").then((m) =>
      m.listKpiSnapshots(workspaceId).then(setRows)
    );
  }, [workspaceId]);

  const reversed = rows.slice().reverse();

  return {
    labels: reversed.map((row) => row.snapshot_date),
    ordersSeries: reversed.map((row) => Number(row.orders_count ?? 0)),
    revenueSeries: reversed.map((row) => Number(row.gross_revenue ?? 0)),
    driversSeries: reversed.map((row) => Number(row.active_drivers ?? 0)),
    merchantsSeries: reversed.map((row) => Number(row.active_merchants ?? 0)),
    raw: rows,
  };
}
