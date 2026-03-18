import { supabase } from "@/integrations/supabase/client";

export async function autoDiscoverRestaurants(city: string) {
  const mock = [
    { name: "Pizza Marina House", area: "Marina" },
    { name: "Downtown Pizza Express", area: "Downtown" },
  ];

  for (const r of mock) {
    await supabase.from("sales_ai_leads").insert({
      company_name: r.name,
      city,
      area: r.area,
      lead_source: "auto_discovery",
      status: "new",
    });
  }
}

export async function autoLaunchCityCampaign(city: string) {
  const { data: leads } = await supabase
    .from("sales_ai_leads")
    .select("*")
    .eq("city", city);

  for (const lead of leads ?? []) {
    await supabase.from("sales_ai_activities").insert({
      lead_id: lead.id,
      activity_type: "auto_campaign",
      content: `Launch offer for ${city}`,
    });
  }
}
