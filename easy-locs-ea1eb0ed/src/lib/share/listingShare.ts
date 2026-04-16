import { APP_BASE_URL } from "@/lib/app-domain";

export function buildListingShareUrl(listingId: string) {
  return `${APP_BASE_URL}/properties?listing=${listingId}`;
}

export async function shareListing(listingId: string, title: string) {
  const url = buildListingShareUrl(listingId);

  if (navigator.share) {
    try {
      await navigator.share({ title, text: title, url });
      return;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
  }
}
