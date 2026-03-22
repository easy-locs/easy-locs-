import { platformBus } from "@/lib/shared/platform-bus";
import { runEngineHealthChecks } from "@/lib/engine/engineHealthChecks";

export async function executeEngineAction(action: string) {
  switch (action) {
    case "health_check":
      return runEngineHealthChecks();

    case "emit_test_order_created":
      return platformBus.emit(
        "ORDER_CREATED",
        {
          orderId: crypto.randomUUID(),
          merchantId: "test-merchant",
          customerUserId: "test-user",
          amount: 99,
          currency: "AED",
        },
        { source: "central-control-panel" }
      );

    case "emit_test_payment_success":
      return platformBus.emit(
        "PAYMENT_SUCCESS",
        {
          orderId: crypto.randomUUID(),
          amount: 99,
          currency: "AED",
          merchantId: "test-merchant",
          customerUserId: "test-user",
          paymentMethodType: "card",
        },
        { source: "central-control-panel" }
      );

    case "emit_test_support_ticket":
      return platformBus.emit(
        "ISSUE_CREATED",
        {
          ticketId: crypto.randomUUID(),
          orderId: null,
          requesterUserId: "test-user",
          type: "general_issue",
        },
        { source: "central-control-panel" }
      );

    default:
      throw new Error(`Unknown engine action: ${action}`);
  }
}
