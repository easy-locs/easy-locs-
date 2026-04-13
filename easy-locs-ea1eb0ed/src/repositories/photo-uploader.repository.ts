/**
 * photo-uploader.repository — Storage operations for RealEstatePhotoUploader.
 */
import { db } from "@/services/db";

export async function uploadPropertyPhoto(path: string, file: File) {
  const { error } = await db.storage.from("property-photos").upload(path, file);
  if (error) throw error;
}

export function getPublicUrl(path: string) {
  const { data } = db.storage.from("property-photos").getPublicUrl(path);
  return data.publicUrl;
}

export async function updateListingPhotos(listingId: string, photos: string[]) {
  await db("real_estate_listings").update({ photo_urls: photos } as any).eq("id", listingId);
}

export async function removeStorageFile(path: string) {
  await db.storage.from("property-photos").remove([path]);
}
