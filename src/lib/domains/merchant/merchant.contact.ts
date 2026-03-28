/**
 * merchant.contact — Contact information for merchants.
 */

export interface MerchantContact {
  phone?: string;
  email?: string;
  whatsapp?: string;
  instagram?: string;
  website?: string;
  orbitId?: string;
}

export function hasMinimumContact(contact: MerchantContact): boolean {
  return !!(contact.phone || contact.email || contact.whatsapp || contact.orbitId);
}

export function buildContactScore(contact: MerchantContact): number {
  let score = 0;
  if (contact.phone) score += 25;
  if (contact.email) score += 20;
  if (contact.whatsapp) score += 15;
  if (contact.website) score += 15;
  if (contact.instagram) score += 10;
  if (contact.orbitId) score += 15;
  return Math.min(100, score);
}
