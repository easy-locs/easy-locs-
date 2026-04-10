/**
 * entry-guards — Synchronous validation guards for all critical create/update/publish/pay actions.
 * Runs immediate validation at the exact moment of action.
 * Rejects invalid data before it enters the system.
 */

import { isValidVertical, CANONICAL_VERTICALS } from "./taxonomy-guard";
import { reportAnomaly } from "./anomaly-detector";

export interface GuardResult {
  allowed: boolean;
  errors: string[];
  warnings: string[];
  guardName: string;
  timestamp: string;
}

let totalGuardCalls = 0;
let totalRejections = 0;

function trackGuardCallInternal(rejected: boolean) {
  totalGuardCalls++;
  if (rejected) totalRejections++;
}

function createResult(guardName: string, errors: string[], warnings: string[] = []): GuardResult {
  const result = {
    allowed: errors.length === 0,
    errors,
    warnings,
    guardName,
    timestamp: new Date().toISOString(),
  };
  trackGuardCallInternal(!result.allowed);
  return result;
}

export function guardProviderCreate(data: {
  name?: string;
  vertical?: string;
  phone?: string;
  email?: string;
}): GuardResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.name || data.name.trim().length < 2) errors.push("Provider name is required (min 2 characters)");
  if (!data.vertical) errors.push("Vertical is required");
  else if (!isValidVertical(data.vertical)) errors.push(`Invalid vertical "${data.vertical}" — must be one of: ${CANONICAL_VERTICALS.join(", ")}`);
  if (!data.phone && !data.email) warnings.push("No contact info provided — will be marked as incomplete");

  if (errors.length > 0) {
    reportAnomaly("architecture_violation", "entry-guard", `Provider create blocked: ${errors.join("; ")}`, "medium");
  }

  return createResult("provider-create", errors, warnings);
}

export function guardProviderUpdate(data: {
  id: string;
  vertical?: string;
  name?: string;
}): GuardResult {
  const errors: string[] = [];

  if (!data.id) errors.push("Provider ID is required");
  if (data.vertical && !isValidVertical(data.vertical)) {
    errors.push(`Cannot change to invalid vertical "${data.vertical}"`);
  }
  if (data.name !== undefined && data.name.trim().length < 2) {
    errors.push("Provider name must be at least 2 characters");
  }

  return createResult("provider-update", errors);
}

export function guardListingCreate(data: {
  title?: string;
  vertical?: string;
  providerId?: string;
  price?: number;
  currency?: string;
  images?: string[];
}): GuardResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.title || data.title.trim().length < 3) errors.push("Listing title required (min 3 chars)");
  if (!data.vertical) errors.push("Vertical is required");
  else if (!isValidVertical(data.vertical)) errors.push(`Invalid vertical "${data.vertical}"`);
  if (!data.providerId) errors.push("Provider ID is required");
  if (data.price !== undefined && data.price < 0) errors.push("Price cannot be negative");
  if (!data.images || data.images.length === 0) warnings.push("No images — listing will have reduced visibility");

  const imageSet = new Set(data.images || []);
  if (data.images && imageSet.size < data.images.length) {
    warnings.push("Duplicate images detected in listing");
  }

  return createResult("listing-create", errors, warnings);
}

export function guardListingPublish(data: {
  id: string;
  title?: string;
  vertical?: string;
  price?: number;
  images?: string[];
  description?: string;
  category?: string;
}): GuardResult {
  const errors: string[] = [];

  if (!data.id) errors.push("Listing ID required");
  if (!data.title || data.title.trim().length < 3) errors.push("Title required for publishing");
  if (!data.vertical) errors.push("Vertical required for publishing");
  else if (!isValidVertical(data.vertical)) errors.push(`Invalid vertical "${data.vertical}"`);
  if (!data.description || data.description.trim().length < 10) errors.push("Description required (min 10 chars)");
  if (!data.images || data.images.length === 0) errors.push("At least 1 image required for publishing");

  if (errors.length > 0) {
    reportAnomaly("architecture_violation", "entry-guard",
      `Listing publish blocked for ${data.id}: ${errors.join("; ")}`, "medium");
  }

  return createResult("listing-publish", errors);
}

export function guardPaymentCreate(data: {
  amount?: number;
  currency?: string;
  fromWalletId?: string;
  toWalletId?: string;
  orderId?: string;
}): GuardResult {
  const errors: string[] = [];

  if (!data.amount || data.amount <= 0) errors.push("Payment amount must be positive");
  if (!data.currency) errors.push("Currency is required");
  if (!data.fromWalletId) errors.push("Source wallet ID required");
  if (data.fromWalletId === data.toWalletId) errors.push("Cannot pay to same wallet");

  if (errors.length > 0) {
    reportAnomaly("architecture_violation", "entry-guard",
      `Payment blocked: ${errors.join("; ")}`, "critical",
      { amount: data.amount, currency: data.currency });
  }

  return createResult("payment-create", errors);
}

export function guardWalletTransaction(data: {
  walletId?: string;
  amount?: number;
  type?: string;
  currency?: string;
}): GuardResult {
  const errors: string[] = [];

  if (!data.walletId) errors.push("Wallet ID required");
  if (!data.amount || data.amount <= 0) errors.push("Transaction amount must be positive");
  if (!data.type) errors.push("Transaction type required");
  if (!data.currency) errors.push("Currency required");

  if (errors.length > 0) {
    reportAnomaly("architecture_violation", "entry-guard",
      `Wallet transaction blocked: ${errors.join("; ")}`, "critical");
  }

  return createResult("wallet-transaction", errors);
}

export function guardStoryCreate(data: {
  vertical?: string;
  entityId?: string;
  mediaUrl?: string;
  title?: string;
}): GuardResult {
  const errors: string[] = [];

  if (!data.vertical) errors.push("Story vertical required");
  else if (!isValidVertical(data.vertical)) errors.push(`Invalid story vertical "${data.vertical}"`);
  if (!data.entityId) errors.push("Story must be linked to an entity");
  if (!data.mediaUrl) errors.push("Story media URL required");

  return createResult("story-create", errors);
}

export function guardMediaUpload(data: {
  entityId?: string;
  entityVertical?: string;
  mimeType?: string;
  fileSize?: number;
}): GuardResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.entityId) errors.push("Entity ID required for media");
  if (data.entityVertical && !isValidVertical(data.entityVertical)) {
    errors.push(`Invalid entity vertical "${data.entityVertical}"`);
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];
  if (data.mimeType && !allowedTypes.includes(data.mimeType)) {
    errors.push(`Invalid media type "${data.mimeType}" — allowed: ${allowedTypes.join(", ")}`);
  }

  const maxSize = 10 * 1024 * 1024;
  if (data.fileSize && data.fileSize > maxSize) {
    errors.push(`File too large (${Math.round(data.fileSize / 1024 / 1024)}MB) — max 10MB`);
  }

  return createResult("media-upload", errors, warnings);
}

export function guardOrderCreate(data: {
  items?: unknown[];
  totalAmount?: number;
  currency?: string;
  customerWalletId?: string;
  merchantId?: string;
}): GuardResult {
  const errors: string[] = [];

  if (!data.items || data.items.length === 0) errors.push("Order must have at least 1 item");
  if (!data.totalAmount || data.totalAmount <= 0) errors.push("Order total must be positive");
  if (!data.currency) errors.push("Currency required");
  if (!data.customerWalletId) errors.push("Customer wallet required");
  if (!data.merchantId) errors.push("Merchant ID required");

  return createResult("order-create", errors);
}

export function guardBookingCreate(data: {
  entityId?: string;
  vertical?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}): GuardResult {
  const errors: string[] = [];

  if (!data.entityId) errors.push("Entity ID required");
  if (!data.vertical) errors.push("Vertical required");
  else if (!isValidVertical(data.vertical)) errors.push(`Invalid vertical "${data.vertical}"`);
  if (!data.checkIn) errors.push("Check-in date required");
  if (!data.checkOut) errors.push("Check-out date required");

  if (data.checkIn && data.checkOut && new Date(data.checkIn) >= new Date(data.checkOut)) {
    errors.push("Check-out must be after check-in");
  }

  if (data.guests !== undefined && data.guests < 1) errors.push("At least 1 guest required");

  return createResult("booking-create", errors);
}

export function trackGuardCall(rejected: boolean) {
  trackGuardCallInternal(rejected);
}

export function getGuardMetrics() {
  return { totalGuardCalls, totalRejections, guardCount: 10 };
}

export function runEntryGuards(): { status: string; guardCount: number; totalCalls: number; totalRejections: number } {
  console.log(`[entry-guards] Synchronous entry guards active — 10 types, ${totalGuardCalls} calls, ${totalRejections} rejections`);
  return { status: "active", guardCount: 10, totalCalls: totalGuardCalls, totalRejections };
}
