/**
 * AdminRestaurantTestSeederPage — Seed/delete 50 test restaurants.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

function fakeRestaurants(count: number) {
  const cities = ["Dubai Marina", "JLT", "Business Bay", "Al Barsha", "Deira"];
  return Array.from({ length: count }).map((_, i) => ({
    business_name: `TEST PIZZA ${i + 1}`,
    city: cities[i % cities.length],
    country_code: "AE",
    status: "imported_not_claimed",
    business_type: "pizza",
  }));
}

export default function AdminRestaurantTestSeederPage() {
  const [busy, setBusy] = useState(false);

  const seed50 = async () => {
    setBusy(true);
    try {
      const rows = fakeRestaurants(50);
      await (supabase as any).from("merchant_onboarding_profiles").insert(rows);
      alert("50 restaurants inserted");
    } catch (e: any) {
      alert(e.message ?? "Insert failed");
    }
    setBusy(false);
  };

  const wipe50 = async () => {
    setBusy(true);
    try {
      await (supabase as any)
        .from("merchant_onboarding_profiles")
        .delete()
        .ilike("business_name", "TEST PIZZA%");
      alert("Test restaurants deleted");
    } catch (e: any) {
      alert(e.message ?? "Delete failed");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground">50 Restaurant Test Launcher</h1>
      <p className="text-sm text-muted-foreground">
        Seed test restaurants and delete them if onboarding fails
      </p>

      <div className="flex gap-3">
        <Button onClick={seed50} disabled={busy}>
          Insert 50
        </Button>
        <Button variant="destructive" onClick={wipe50} disabled={busy}>
          Delete Test Batch
        </Button>
      </div>
    </div>
  );
}
