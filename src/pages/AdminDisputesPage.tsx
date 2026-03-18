/**
 * AdminDisputesPage — /admin/disputes — View and resolve ride disputes.
 */
import { useEffect, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
              <Button
                onClick={() => resolve(d.id)}
                size="sm"
                className="rounded-xl"
              >
                Resolve
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
