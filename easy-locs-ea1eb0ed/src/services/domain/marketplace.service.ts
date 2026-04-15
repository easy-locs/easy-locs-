import { marketplaceRepo } from "@/repositories/domain/marketplace.repo";

export async function fetchC2CListings(options: {
  category?: string;
  condition?: string;
  limit?: number;
}) {
  return marketplaceRepo.listC2CListings(options);
}

export async function fetchC2CListingDetail(id: string) {
  return marketplaceRepo.getC2CListingDetail(id);
}

export async function incrementListingViewCount(id: string, currentCount: number) {
  await marketplaceRepo.incrementViewCount(id, currentCount);
}

export async function fetchSellerProfile(providerId: string) {
  const provider = await marketplaceRepo.getProvider(providerId);
  if (!provider) return null;

  const [activeCount, soldCount, reviews] = await Promise.all([
    marketplaceRepo.countActiveListings(providerId),
    marketplaceRepo.countSoldListings(providerId),
    marketplaceRepo.getReviewRatings(providerId),
  ]);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum: number, r: { rating?: number }) => sum + (r.rating || 0), 0) / reviews.length
      : 0;

  let displayName = provider.display_name || "Particulier";
  if (!displayName && provider.user_id) {
    displayName = (await marketplaceRepo.getProfileName(provider.user_id)) || "Particulier";
  }

  return {
    id: provider.id,
    displayName,
    avatarUrl: null as string | null,
    memberSince: provider.created_at,
    activeListings: activeCount,
    soldListings: soldCount,
    averageRating: Math.round(avgRating * 10) / 10,
    reviewCount: reviews.length,
    isPro: provider.is_verified ?? false,
  };
}

export async function saveSearchAlert(
  userId: string,
  orbitId: string,
  name: string,
  filters: Record<string, unknown>
) {
  await marketplaceRepo.saveSearchAlert(userId, orbitId, name, filters);
}

export async function fetchUserOrbitId(userId: string): Promise<string | null> {
  return marketplaceRepo.getUserOrbitId(userId);
}

export async function updateListingPhotos(listingId: string, photoUrls: string[]) {
  await marketplaceRepo.updatePhotos(listingId, photoUrls);
}

export async function uploadListingPhoto(
  orgId: string,
  listingId: string,
  file: File
): Promise<string | null> {
  return marketplaceRepo.uploadPhoto(orgId, listingId, file);
}
