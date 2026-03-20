export function buildListingShareUrl(listingId: string) {
  return `${window.location.origin}/properties?listing=${listingId}`;
}

export async function shareListing(listingId: string, title: string) {
  const url = buildListingShareUrl(listingId);

  if (navigator.share) {
    await navigator.share({ title, text: title, url });
    return;
  }

  await navigator.clipboard.writeText(url);
}
