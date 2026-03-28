/**
 * photo-uploader.repository — Storage operations for RealEstatePhotoUploader.
 */
import { supabase } from "@/integrations/supabase/client";

export async function uploadPropertyPhoto(path: string, file: File) {
  const { error } = await supabase.storage.from("property-photos").upload(path, file);
  if (error) throw error;
}

export function getPublicUrl(path: string) {
  const { data } = supabase.storage.from("property-photos").getPublicUrl(path);
  return data.publicUrl;
}

export async function updateListingPhotos(listingId: string, photos: string[]) {
  await supabase.from("real_estate_listings").update({ photo_urls: photos } as any).eq("id", listingId);
}

export async function removeStorageFile(path: string) {
  await supabase.storage.from("property-photos").remove([path]);
}
