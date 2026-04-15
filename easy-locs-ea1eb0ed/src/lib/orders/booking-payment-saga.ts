import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import { checkThrottle, ThrottleError } from "@/lib/client-throttle";

export type SagaStep = "payment_created" | "payment_captured" | "booking_confirmed" | "notification_sent";
export type SagaStatus = "running" | "completed" | "compensating" | "failed";

interface SagaState {
  sagaId: string;
  bookingId: string;
  paymentIntentId: string | null;
  status: SagaStatus;
  completedSteps: SagaStep[];
  error: string | null;
}

async function logSagaEvent(sagaId: string, step: string, status: string, detail?: string) {
  await db.from("saga_events").insert({
    saga_id: sagaId,
    step,
    status,
    detail: detail ?? null,
    created_at: new Date().toISOString(),
  } as Record<string, unknown>).catch(() => {});
}

export async function runBookingPaymentSaga(params: {
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  merchantId?: string;
}): Promise<SagaState> {
  const throttle = checkThrottle("api:payment");
  if (!throttle.allowed) {
    throw new ThrottleError("api:payment", throttle.retryAfterMs);
  }

  const sagaId = crypto.randomUUID();
  const state: SagaState = {
    sagaId,
    bookingId: params.bookingId,
    paymentIntentId: null,
    status: "running",
    completedSteps: [],
    error: null,
  };

  try {
    const { data: intent, error: payErr } = await db
      .from("payment_intents")
      .insert({
        booking_id: params.bookingId,
        user_id: params.userId,
        amount: params.amount,
        currency: params.currency,
        status: "requires_capture",
        merchant_id: params.merchantId ?? null,
        saga_id: sagaId,
        metadata: { saga_id: sagaId, booking_id: params.bookingId },
        created_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .select("id, stripe_payment_intent_id")
      .single();

    if (payErr || !intent) throw new Error(`Payment creation failed: ${payErr?.message}`);
    const typedIntent = intent as { id: string; stripe_payment_intent_id?: string | null };
    state.paymentIntentId = typedIntent.id;
    state.completedSteps.push("payment_created");
    await logSagaEvent(sagaId, "payment_created", "success", state.paymentIntentId);

    const { error: captureErr } = await db
      .from("payment_intents")
      .update({ status: "pending_capture", requested_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", state.paymentIntentId);

    if (captureErr) throw new Error(`Payment capture request failed: ${captureErr.message}`);
    state.completedSteps.push("payment_captured");
    await logSagaEvent(sagaId, "payment_capture_requested", "success");

    const { error: bookErr } = await db
      .from("bookings")
      .update({
        status: "pending_payment_confirmation",
        payment_intent_id: state.paymentIntentId,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("id", params.bookingId);

    if (bookErr) throw new Error(`Booking update failed: ${bookErr.message}`);
    state.completedSteps.push("booking_confirmed");
    await logSagaEvent(sagaId, "booking_awaiting_webhook", "success");

    platformBus.emit("saga:booking_payment_pending", {
      sagaId,
      bookingId: params.bookingId,
      paymentIntentId: state.paymentIntentId,
    }, "system");
    state.completedSteps.push("notification_sent");
    state.status = "completed";
    await logSagaEvent(sagaId, "saga_completed_awaiting_webhook", "success");

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    state.error = message;
    state.status = "compensating";
    await logSagaEvent(sagaId, "saga_error", "error", message);

    await compensate(state);
    state.status = "failed";
    await logSagaEvent(sagaId, "saga_failed", "error", message);

    platformBus.emit("saga:booking_payment_failed", {
      sagaId,
      bookingId: params.bookingId,
      error: message,
      compensatedSteps: state.completedSteps,
    }, "system");
  }

  return state;
}

async function compensate(state: SagaState) {
  const steps = [...state.completedSteps].reverse();

  let paymentHandled = false;

  for (const step of steps) {
    try {
      switch (step) {
        case "booking_confirmed":
          await db.from("bookings")
            .update({ status: "cancelled", updated_at: new Date().toISOString() } as Record<string, unknown>)
            .eq("id", state.bookingId);
          await logSagaEvent(state.sagaId, "compensate_booking", "success");
          break;

        case "payment_captured":
          if (state.paymentIntentId && !paymentHandled) {
            await db.from("payment_intents")
              .update({ status: "refunded", refunded_at: new Date().toISOString() } as Record<string, unknown>)
              .eq("id", state.paymentIntentId);
            await logSagaEvent(state.sagaId, "compensate_payment_refund", "success");
            paymentHandled = true;
          }
          break;

        case "payment_created":
          if (state.paymentIntentId && !paymentHandled) {
            await db.from("payment_intents")
              .update({ status: "cancelled" } as Record<string, unknown>)
              .eq("id", state.paymentIntentId);
            await logSagaEvent(state.sagaId, "compensate_payment_cancel", "success");
            paymentHandled = true;
          }
          break;

        case "notification_sent":
          break;
      }
    } catch (compErr: unknown) {
      const msg = compErr instanceof Error ? compErr.message : String(compErr);
      await logSagaEvent(state.sagaId, `compensate_${step}_failed`, "error", msg);
    }
  }
}
