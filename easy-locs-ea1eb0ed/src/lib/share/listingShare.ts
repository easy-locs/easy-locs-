import { shareLink } from "@/lib/share/share-link";

/**
 * Share a listing via the Web Share API or clipboard fallback.
 * Uses the canonical /listing/{id} route.
 */
export async function shareListing(listingId: string, title: string): Promise<void> {
  const url = `${window.location.origin}/listing/${listingId}`;
  await shareLink({ title, url });
}
