import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateCitySeoPack } from "@/lib/growth/city-pages-engine";
import { refreshAllImportedMerchantScores } from "@/lib/growth/growth-automation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GrowthStats {
  merchants: number;
  cityPages: number;
  demandEvents: number;
}

export default function AdminGrowthEnginePage() {
  const [city, setCity] = useState("Dubai");
  const [countryCode, setCountryCode] = useState("AE");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<GrowthStats | null>(null);

  async function loadStats() {
    const [merchants, pages, events] = await Promise.all([
      (supabase as any)
        .from("merchant_onboarding_profiles")
        .select("id", { count: "exact", head: true }),
      (supabase as any)
        .from("growth_city_pages")
        .select("id", { count: "exact", head: true }),
      (supabase as any)
        .from("growth_demand_events")
        .select("id", { count: "exact", head: true }),
    ]);

    setStats({
      merchants: merchants.count ?? 0,
      cityPages: pages.count ?? 0,
      demandEvents: events.count ?? 0,
    });
  }

  useEffect(() => { loadStats(); }, []);

  async function handleGenerateCityPages() {
    setLoading(true);
    try {
      await generateCitySeoPack({
        countryCode,
        city,
        verticals: ["food", "hotel", "retail", "services"],
      });
      toast.success("City SEO pack generated");
      loadStats();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
    setLoading(false);
  }

  async function handleRefreshScores() {
    setLoading(true);
    try {
      await refreshAllImportedMerchantScores(200);
      toast.success("Activation scores refreshed");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Growth Engine</h1>
        <p className="text-sm text-muted-foreground">
          City SEO, imported merchants, demand capture, activation scoring
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Imported merchants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats?.merchants ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">City pages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats?.cityPages ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Demand events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats?.demandEvents ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Generate city SEO pack</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
            placeholder="City"
          />
          <input
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm w-20"
            placeholder="Country code"
          />
          <Button onClick={handleGenerateCityPages} disabled={loading} size="sm">
            Generate
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Activation scoring</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRefreshScores} disabled={loading} size="sm" variant="secondary">
            Refresh imported merchant scores
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
