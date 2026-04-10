/**
 * merchant.fulfillment — Fulfillment policies and capabilities.
 */

export interface MerchantFulfillmentPolicy {
  supportsDelivery: boolean;
  supportsPickup: boolean;
  supportsDineIn: boolean;
  supportsShipping: boolean;
  deliveryRadiusKm?: number;
  estimatedPrepTimeMinutes?: number;
  minimumOrderAmount?: number;
  minimumOrderCurrency?: string;
  deliveryFee?: number;
  freeDeliveryAbove?: number;
}

export function getAvailableMethods(policy: MerchantFulfillmentPolicy): string[] {
  const methods: string[] = [];
  if (policy.supportsDelivery) methods.push("delivery");
  if (policy.supportsPickup) methods.push("pickup");
  if (policy.supportsDineIn) methods.push("dine_in");
  if (policy.supportsShipping) methods.push("shipping");
  return methods;
}

export function meetsMinimumOrder(policy: MerchantFulfillmentPolicy, amount: number): boolean {
  if (!policy.minimumOrderAmount) return true;
  return amount >= policy.minimumOrderAmount;
}
