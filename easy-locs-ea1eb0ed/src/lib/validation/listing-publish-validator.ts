/**
 * Listing Publish Validation — blocks publishing without required data.
 * Anti-fake system: no empty listings can go live.
 */

export interface PublishValidationResult {
  canPublish: boolean;
  errors: string[];
  warnings: string[];
}

export interface ListingPublishData {
  name?: string | null;
  category?: string | null;
  address?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  photo_urls?: string[] | null;
  description?: string | null;
  price?: number | null;
}

/**
 * Validate listing has all required fields before publish.
 * Returns clear error messages for each missing field.
 */
export function validateListingPublish(data: ListingPublishData): PublishValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.name?.trim() || data.name.trim().length < 3) {
    errors.push("Name is required (minimum 3 characters)");
  }

  if (!data.category?.trim()) {
    errors.push("Category is required");
  }

  if (!data.address?.trim()) {
    errors.push("Address is required");
  }

  if (!data.phone?.trim()) {
    errors.push("Phone number is required");
  }

  const hasPhoto = data.photo_url?.trim() ||
    (Array.isArray(data.photo_urls) && data.photo_urls.filter(Boolean).length > 0);
  if (!hasPhoto) {
    errors.push("At least one photo is required");
  }

  // Warnings (soft)
  if (!data.description?.trim() || data.description.trim().length < 20) {
    warnings.push("Add a detailed description to attract more customers");
  }

  if (!data.price || data.price <= 0) {
    warnings.push("Consider adding a price to your listing");
  }

  return {
    canPublish: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Anti-fake detection — flags suspicious patterns.
 */
export function detectSuspiciousListing(data: ListingPublishData): string[] {
  const flags: string[] = [];

  if (data.name && /^[a-z]{1,3}$/i.test(data.name.trim())) {
    flags.push("Name looks too short or generic");
  }

  if (data.phone && !/^\+?[\d\s\-()]{7,}$/.test(data.phone.trim())) {
    flags.push("Phone number format looks invalid");
  }

  if (data.description && data.description === data.name) {
    flags.push("Description is identical to name");
  }

  return flags;
}
