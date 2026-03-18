/**
 * Easy-Locs branded SVG map pin icons.
 * Each returns an SVG string that can be used as innerHTML for map markers.
 */

const BRAND_GOLD = "#D4A853";
const BRAND_DARK = "#1a1a2e";

function wrap(inner: string, bg: string, size = 36): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${bg}" stroke="${BRAND_GOLD}" stroke-width="2"/>
    ${inner}
  </svg>`;
}

/** 🏪 Shop — storefront icon */
export function iconShop(size = 36): string {
  const c = size / 2;
  return wrap(
    `<path d="M${c - 7} ${c - 3}h14v10h-14z" fill="none" stroke="${BRAND_GOLD}" stroke-width="1.5" stroke-linecap="round"/>
     <path d="M${c - 7} ${c - 3}l2-5h10l2 5" fill="none" stroke="${BRAND_GOLD}" stroke-width="1.5"/>
     <line x1="${c}" y1="${c + 2}" x2="${c}" y2="${c + 7}" stroke="${BRAND_GOLD}" stroke-width="1.5"/>`,
    BRAND_DARK, size
  );
}

/** 🔧 Service — wrench icon */
export function iconService(size = 36): string {
  const c = size / 2;
  return wrap(
    `<path d="M${c - 5} ${c + 5}l10-10M${c + 3} ${c - 5}a3 3 0 0 1 2 5l-2-2-1 1 2 2a3 3 0 0 1-5-2z" fill="none" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round"/>`,
    BRAND_DARK, size
  );
}

/** 🚗 Driver — car icon */
export function iconDriver(size = 36): string {
  const c = size / 2;
  return wrap(
    `<rect x="${c - 8}" y="${c - 1}" width="16" height="7" rx="2" fill="none" stroke="#34d399" stroke-width="1.5"/>
     <path d="M${c - 5} ${c - 1}l2-4h6l2 4" fill="none" stroke="#34d399" stroke-width="1.5"/>
     <circle cx="${c - 4}" cy="${c + 6}" r="1.5" fill="#34d399"/>
     <circle cx="${c + 4}" cy="${c + 6}" r="1.5" fill="#34d399"/>`,
    BRAND_DARK, size
  );
}

/** 💳 Payment — card icon */
export function iconPayment(size = 36): string {
  const c = size / 2;
  return wrap(
    `<rect x="${c - 7}" y="${c - 4}" width="14" height="9" rx="1.5" fill="none" stroke="${BRAND_GOLD}" stroke-width="1.5"/>
     <line x1="${c - 7}" y1="${c - 1}" x2="${c + 7}" y2="${c - 1}" stroke="${BRAND_GOLD}" stroke-width="1.5"/>
     <rect x="${c - 5}" y="${c + 1}" width="4" height="2" rx="0.5" fill="${BRAND_GOLD}" opacity="0.6"/>`,
    BRAND_DARK, size
  );
}

/** 📱 QR — qr code icon */
export function iconQR(size = 36): string {
  const c = size / 2;
  return wrap(
    `<rect x="${c - 6}" y="${c - 6}" width="5" height="5" rx="0.5" fill="none" stroke="${BRAND_GOLD}" stroke-width="1.2"/>
     <rect x="${c + 1}" y="${c - 6}" width="5" height="5" rx="0.5" fill="none" stroke="${BRAND_GOLD}" stroke-width="1.2"/>
     <rect x="${c - 6}" y="${c + 1}" width="5" height="5" rx="0.5" fill="none" stroke="${BRAND_GOLD}" stroke-width="1.2"/>
     <rect x="${c + 2}" y="${c + 2}" width="3" height="3" fill="${BRAND_GOLD}" opacity="0.5"/>
     <rect x="${c - 4.5}" y="${c - 4.5}" width="2" height="2" fill="${BRAND_GOLD}"/>
     <rect x="${c + 2.5}" y="${c - 4.5}" width="2" height="2" fill="${BRAND_GOLD}"/>
     <rect x="${c - 4.5}" y="${c + 2.5}" width="2" height="2" fill="${BRAND_GOLD}"/>`,
    BRAND_DARK, size
  );
}

/** 📡 Live — broadcast/signal icon */
export function iconLive(size = 36): string {
  const c = size / 2;
  return wrap(
    `<circle cx="${c}" cy="${c}" r="2" fill="#22d3ee"/>
     <path d="M${c - 4} ${c - 4}a6 6 0 0 1 8 0" fill="none" stroke="#22d3ee" stroke-width="1.3" stroke-linecap="round"/>
     <path d="M${c - 6} ${c - 6}a9 9 0 0 1 12 0" fill="none" stroke="#22d3ee" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
     <path d="M${c + 4} ${c + 4}a6 6 0 0 1-8 0" fill="none" stroke="#22d3ee" stroke-width="1.3" stroke-linecap="round"/>`,
    BRAND_DARK, size
  );
}

/** 📌 Pin — classic map pin */
export function iconPin(size = 36): string {
  const c = size / 2;
  return wrap(
    `<path d="M${c} ${c + 8}l-5-7a6 6 0 1 1 10 0z" fill="${BRAND_GOLD}" opacity="0.2" stroke="${BRAND_GOLD}" stroke-width="1.5"/>
     <circle cx="${c}" cy="${c - 2}" r="2.5" fill="${BRAND_GOLD}"/>`,
    BRAND_DARK, size
  );
}

/** 🛒 Mobile Seller — cart icon */
export function iconMobileSeller(size = 36): string {
  const c = size / 2;
  return wrap(
    `<path d="M${c - 6} ${c - 5}h2l3 8h6l2-5h-9" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
     <circle cx="${c - 1}" cy="${c + 5}" r="1.5" fill="#fbbf24"/>
     <circle cx="${c + 4}" cy="${c + 5}" r="1.5" fill="#fbbf24"/>`,
    BRAND_DARK, size
  );
}

/** Map entity type → icon function */
export const ENTITY_ICON_MAP: Record<string, (size?: number) => string> = {
  fixed_store: iconShop,
  mobile_seller: iconMobileSeller,
  mobile_service: iconService,
  driver: iconDriver,
};

/** Presence mode → icon function */
export const PRESENCE_ICON_MAP: Record<string, (size?: number) => string> = {
  pin: iconPin,
  live: iconLive,
  off: iconPin,
};
