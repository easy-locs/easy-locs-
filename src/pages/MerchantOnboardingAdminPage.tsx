import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function MerchantOnboardingAdminPage() {
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("merchant_onboarding_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setProfiles(data ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Merchant Onboarding Admin</h1>
      <div className="space-y-3">
        {profiles.map((p: any) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-sm font-semibold text-foreground">{p.merchant_name}</p>
            <p className="text-xs text-muted-foreground">{p.city} · {p.area} · {p.cuisine_type}</p>
            <p className="text-xs text-muted-foreground">status: {p.onboarding_status} · mode: {p.activation_mode}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
