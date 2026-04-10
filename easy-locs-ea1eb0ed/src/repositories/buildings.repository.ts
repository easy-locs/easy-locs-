/**
 * Buildings Repository — DB access for Buildings page.
 */
import { supabase } from "@/integrations/supabase/client";

export interface BuildingRecord {
  id: string;
  name: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  units_count: number;
  photo_url: string | null;
}

export async function fetchBuildings(orgId: string): Promise<BuildingRecord[]> {
  const { data } = await supabase
    .from("buildings")
    .select("*")
    .eq("org_id", orgId)
    .order("name");
  return (data || []).map((b: any) => ({
    id: b.id, name: b.name, address: b.address,
    postal_code: b.postal_code, city: b.city, country: b.country,
    units_count: b.units_count ?? 0, photo_url: b.photo_url,
  }));
}

export async function insertBuilding(params: {
  org_id: string;
  user_id: string;
  name: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  units_count: number;
}) {
  const { data, error } = await supabase.from("buildings").insert(params).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBuilding(id: string) {
  const { error } = await supabase.from("buildings").delete().eq("id", id);
  if (error) throw error;
}

export async function updateBuilding(id: string, record: Record<string, any>) {
  const { error } = await supabase.from("buildings").update(record).eq("id", id);
  if (error) throw error;
}
