export function getAppBaseHashUrl(): string {
  return `${window.location.origin}/#`;
}

export function toAppPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getAppBaseHashUrl()}${normalized}`;
}

export function profileLink(userId: string): string {
  return toAppPath(`/u/${userId}`);
}

export function productLink(productId: string): string {
  return toAppPath(`/p/${productId}`);
}

export function shopLink(slug: string): string {
  return toAppPath(`/s/${slug}`);
}

export function paymentRequestLink(requestId: string): string {
  return toAppPath(`/pay/request/${requestId}`);
}

export function radarLink(): string {
  return toAppPath("/super-map");
}

export function walletLink(): string {
  return toAppPath("/dashboard/wallet");
}
