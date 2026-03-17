/**
 * Marketplace & Shop Validation Rules — V4 MAX REAL
 * Enforces quality gates on listings and shops.
 */

export interface ListingValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ShopValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate a marketplace listing before publish */
export function validateListing(data: {
  title?: string;
  description?: string;
  photo_urls?: string[] | any[];
  price?: number;
}): ListingValidationResult {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length < 10) {
    errors.push("Title must be at least 10 characters");
  }
  if (!data.description || data.description.trim().length < 30) {
    errors.push("Description must be at least 30 characters");
  }
  const photos = Array.isArray(data.photo_urls) ? data.photo_urls.filter(Boolean) : [];
  if (photos.length < 2) {
    errors.push("Minimum 2 images required");
  }
  if (data.price !== undefined && data.price < 0) {
    errors.push("Price cannot be negative");
  }

  return { valid: errors.length === 0, errors };
}

/** Validate a shop before creation/publish */
export function validateShop(data: {
  name?: string;
  logo_url?: string | null;
}): ShopValidationResult {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push("Shop name is required (min 2 characters)");
  }
  if (!data.logo_url) {
    errors.push("Shop logo is required — no logo, no shop");
  }

  return { valid: errors.length === 0, errors };
}

/** Validate wallet transaction data integrity */
export function validateTransaction(data: {
  amount?: number;
  reference_code?: string;
  status?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.amount || data.amount <= 0) {
    errors.push("Transaction amount must be positive");
  }
  if (!data.status) {
    errors.push("Transaction status is required");
  }

  return { valid: errors.length === 0, errors };
}
