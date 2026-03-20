import { useState } from "react";
import { createV1OrderDraft, markV1OrderPaid, type V1CheckoutInput } from "@/lib/v1/customerOrderFlow";

export function useV1Checkout() {
  const [submitting, setSubmitting] = useState(false);

  const submitCheckout = async (input: V1CheckoutInput) => {
    setSubmitting(true);
    try {
      const order = await createV1OrderDraft(input);

      await markV1OrderPaid({
        orderId: order.id,
        amount: Number(order.total_amount ?? 0),
        currency: order.currency ?? "AED",
        merchantId: input.merchantId,
        customerUserId: input.customerUserId,
        paymentMethodType: input.paymentMethod,
      });

      return order;
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, submitCheckout };
}
