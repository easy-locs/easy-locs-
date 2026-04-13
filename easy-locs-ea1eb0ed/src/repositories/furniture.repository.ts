/**
 * furniture.repository — All DB operations for FurnitureInventory page.
 */
import { db } from "@/services/db";

export async function fetchFurnitureData(orgId: string, countryFilter: string | null) {
  let propQuery = db("properties").select("id, label, furnished, country").eq("org_id", orgId);
  if (countryFilter) propQuery = propQuery.eq("country", countryFilter);
  propQuery = propQuery.order("country").order("label");
  const { data: props } = await propQuery;
  const filteredProps = props || [];

  const propIds = filteredProps.map((p: any) => p.id);
  let items: any[] = [];
  if (propIds.length > 0) {
    const { data } = await db("furniture_items").select("*").eq("org_id", orgId).in("property_id", propIds);
    items = data || [];
  } else if (!countryFilter) {
    const { data } = await db("furniture_items").select("*").eq("org_id", orgId);
    items = data || [];
  }

  return { properties: filteredProps, items };
}

export async function createFurnitureItem(orgId: string, form: {
  property_id: string; room_name: string; item_name: string;
  quantity: number; condition: string; notes: string;
}) {
  const { data, error } = await db("furniture_items").insert({
    org_id: orgId, ...form,
  } as any).select().single();
  if (error) throw error;
  return data;
}

export async function updateFurniturePhotoUrl(itemId: string, photoUrl: string) {
  await db("furniture_items").update({ photo_url: photoUrl } as any).eq("id", itemId);
}

export async function uploadFurniturePhoto(orgId: string, itemId: string, file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${orgId}/furniture/${itemId}.${ext}`;
  const { error } = await db.storage.from("property-photos").upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = db.storage.from("property-photos").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFurnitureItem(id: string, orgId: string) {
  const { error } = await db("furniture_items").delete().eq("id", id);
  if (error) throw error;
  await db.storage.from("property-photos").remove([
    `${orgId}/furniture/${id}.jpg`, `${orgId}/furniture/${id}.png`, `${orgId}/furniture/${id}.webp`,
  ]);
}
