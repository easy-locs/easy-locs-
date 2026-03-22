import { createCheckoutPayment, confirmWalletOrCashOrder } from "@/lib/payments/paymentService";
import { holdEscrow } from "@/lib/wallet/ledger";
import { platformBus } from "@/lib/shared/platform-bus";

export async function placeOrderWithRealPayment(params: {
  orderId: string;
  total: number;
  currency: string;
  customerUserId: string;
  merchantId?: string | null;
  paymentMethod: "card" | "apple_pay" | "google_pay" | "wallet" | "cash";
}) {
  if (params.paymentMethod === "wallet") {
    await holdEscrow({
      customerUserId: params.customerUserId,
      amount: params.total,
      currency: params.currency,
      orderId: params.orderId,
    });

    await confirmWalletOrCashOrder({
      orderId: params.orderId,
      amount: params.total,
      currency: params.currency,
      customerUserId: params.customerUserId,
      merchantId: params.merchantId ?? null,
      paymentMethodType: "wallet",
    });

    await platformBus.emit(
      "ORDER_CREATED",
      {
        orderId: params.orderId,
        customerUserId: params.customerUserId,
        merchantId: params.merchantId ?? "",
        totalAmount: params.total,
        currency: params.currency,
      },
      { source: "checkout:wallet" }
    );

    return { mode: "wallet" as const, done: true };
  }

  if (params.paymentMethod === "cash") {
    await confirmWalletOrCashOrder({
      orderId: params.orderId,
      amount: params.total,
      currency: params.currency,
      customerUserId: params.customerUserId,
      merchantId: params.merchantId ?? null,
      paymentMethodType: "cash",
    });

    await platformBus.emit(
      "ORDER_CREATED",
      {
        orderId: params.orderId,
        customerUserId: params.customerUserId,
        merchantId: params.merchantId ?? "",
        totalAmount: params.total,
        currency: params.currency,
      },
      { source: "checkout:cash" }
    );

    return { mode: "cash" as const, done: true };
  }

  const payment = await createCheckoutPayment({
    orderId: params.orderId,
    amount: params.total,
    currency: params.currency,
    customerUserId: params.customerUserId,
    merchantId: params.merchantId ?? null,
    paymentMethodType: params.paymentMethod,
  });

  await platformBus.emit(
    "ORDER_CREATED",
    {
      orderId: params.orderId,
      customerUserId: params.customerUserId,
      merchantId: params.merchantId ?? "",
      totalAmount: params.total,
      currency: params.currency,
    },
    { source: "checkout:card" }
  );

  return payment;
}
