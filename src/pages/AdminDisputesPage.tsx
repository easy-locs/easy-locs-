/**
 * AdminDisputesPage — /admin/disputes — View, resolve, and refund ride disputes.
 */
import { useEffect, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { issueDisputeGoodwillCredit } from "@/lib/wallet/credit-policies";

export default function AdminDisputesPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("ride_disputes" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as any[]) ?? []));
  }, []);

  const resolve = async (id: string) => {
    await supabase
      .from("ride_disputes" as any)
      .update({ status: "resolved", updated_at: new Date().toISOString() } as any)
      .eq("id", id);

    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "resolved" } : r)),
    );
  };

  const refund = async (id: string, rideRequestId: string) => {
    await supabase
      .from("ride_disputes" as any)
      .update({ status: "refunded", updated_at: new Date().toISOString() } as any)
      .eq("id", id);

    await (supabase as any)
      .from("mobility_jobs")
      .update({ status: "cancelled", cancel_reason: "dispute_refunded", updated_at: new Date().toISOString() })
      .eq("id", rideRequestId);

    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "refunded" } : r)),
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <BackCard />
        <h1 className="text-lg font-bold text-foreground">Ride disputes</h1>

        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No disputes found</p>
        )}

        {rows.map((d) => (
          <div key={d.id} className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground">{d.dispute_type}</p>
            <p className="text-xs text-muted-foreground">{d.reason}</p>

            <p className="text-xs font-medium text-muted-foreground">
              Status: {d.status}
            </p>

            {d.status === "open" && (
              <div className="flex gap-2 pt-1">
                <Button onClick={() => resolve(d.id)} size="sm" className="rounded-xl">
                  Resolve
                </Button>
                <Button
                  onClick={() => refund(d.id, d.ride_request_id)}
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                >
                  Refund
                </Button>
                <Button
                  onClick={() => issueDisputeGoodwillCredit({ userId: d.opened_by, rideRequestId: d.ride_request_id, amount: 15 })}
                  size="sm"
                  variant="secondary"
                  className="rounded-xl"
                >
                  Give 15 AED credit
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
