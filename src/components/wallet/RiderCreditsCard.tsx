import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function RiderCreditsCard({ userId }: { userId: string }) {
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    supabase
      .from("user_wallet_credits" as any)
      .select("*")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => setCredits(Number((data as any)?.credits_amount || 0)));
  }, [userId]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">Ride credits</p>
      <p className="text-xl font-bold text-foreground">{credits.toFixed(2)} AED</p>
      <p className="text-xs text-muted-foreground mt-1">Use credits on future rides</p>
    </div>
  );
}
