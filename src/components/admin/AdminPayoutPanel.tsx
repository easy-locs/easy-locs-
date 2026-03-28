import { useEffect } from "react";
import { useAdminPayoutStore } from "@/stores/adminPayoutStore";

export function AdminPayoutPanel() {
  const items = useAdminPayoutStore((s) => s.items);
  const loading = useAdminPayoutStore((s) => s.loading);
  const hydrate = useAdminPayoutStore((s) => s.hydrate);
  const approve = useAdminPayoutStore((s) => s.approve);
  const reject = useAdminPayoutStore((s) => s.reject);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="text-lg font-semibold text-foreground mb-3">Admin Payout Approval</h3>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payout requests</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-sm font-medium text-foreground break-words leading-snug">{item.id}</p>
              <p className="text-xs text-muted-foreground">
                Owner: {item.owner_orbit_id}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {item.amount} {item.currency}
              </p>
              <p className="text-xs text-muted-foreground">
                Status: <span className="font-medium">{item.status}</span>
              </p>

              {item.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <button
                    disabled={loading}
                    onClick={() => void approve(item.id)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => void reject(item.id, "Rejected by admin")}
                    className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
