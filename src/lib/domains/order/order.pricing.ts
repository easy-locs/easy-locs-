/**
 * order.pricing — Order pricing calculations.
 */

export interface OrderPricing {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
}

export function calculateOrderPricing(params: {
  subtotal: number;
  deliveryFee?: number;
  serviceFeeRate?: number;
  taxRate?: number;
  discount?: number;
  currency: string;
}): OrderPricing {
  const deliveryFee = params.deliveryFee ?? 0;
  const serviceFee = Math.round(params.subtotal * (params.serviceFeeRate ?? 0.05) * 100) / 100;
  const taxableAmount = params.subtotal + deliveryFee + serviceFee;
  const tax = Math.round(taxableAmount * (params.taxRate ?? 0) * 100) / 100;
  const discount = params.discount ?? 0;
  const total = Math.round((taxableAmount + tax - discount) * 100) / 100;

  return {
    subtotal: params.subtotal,
    deliveryFee,
    serviceFee,
    tax,
    discount,
    total: Math.max(0, total),
    currency: params.currency,
  };
}
