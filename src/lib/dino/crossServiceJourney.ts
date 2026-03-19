/**
 * DINO V20 — Cross-Service Journey Orchestrator
 * Links services into seamless multi-step journeys.
 */
import { supabase } from "@/integrations/supabase/client";
import { recordSignal, type ServiceVertical } from "./recommendationBrain";

export type JourneyType =
  | "food_delivery"        // order → driver → wallet payout
  | "travel_complete"      // booking → airport ride → hotel → local food
  | "property_inquiry"     // chat → visit → booking → payment
  | "shop_and_deliver"     // browse → order → delivery
  | "service_booking";     // search → book → pay → review

export interface JourneyStep {
  vertical: ServiceVertical;
  action: string;
  status: "pending" | "active" | "completed" | "skipped";
  entityId?: string;
  completedAt?: string;
}

const JOURNEY_TEMPLATES: Record<JourneyType, JourneyStep[]> = {
  food_delivery: [
    { vertical: "food", action: "place_order", status: "pending" },
    { vertical: "send", action: "driver_assigned", status: "pending" },
    { vertical: "food", action: "delivered", status: "pending" },
  ],
  travel_complete: [
    { vertical: "travel", action: "book_accommodation", status: "pending" },
    { vertical: "taxi", action: "airport_transfer", status: "pending" },
    { vertical: "food", action: "local_dining", status: "pending" },
  ],
  property_inquiry: [
    { vertical: "property", action: "inquiry", status: "pending" },
    { vertical: "property", action: "visit_scheduled", status: "pending" },
    { vertical: "property", action: "booking_confirmed", status: "pending" },
  ],
  shop_and_deliver: [
    { vertical: "shops", action: "browse", status: "pending" },
    { vertical: "shops", action: "checkout", status: "pending" },
    { vertical: "send", action: "delivery", status: "pending" },
  ],
  service_booking: [
    { vertical: "services", action: "search", status: "pending" },
    { vertical: "services", action: "book", status: "pending" },
    { vertical: "services", action: "review", status: "pending" },
  ],
};

/** Start a new cross-service journey */
export async function startJourney(userId: string, journeyType: JourneyType): Promise<string> {
  const steps = JOURNEY_TEMPLATES[journeyType].map(s => ({ ...s }));
  steps[0].status = "active";

  const { data, error } = await (supabase as any)
    .from("cross_service_journeys")
    .insert({
      user_id: userId,
      journey_type: journeyType,
      status: "active",
      steps: steps,
      current_step: 0,
    })
    .select("id")
    .single();

  if (error) throw error;

  // Record signal for recommendation engine
  await recordSignal({
    userId,
    signalType: "order",
    vertical: steps[0].vertical,
    entityId: data.id,
    entityType: "journey",
  });

  return data.id;
}

/** Advance a journey to the next step */
export async function advanceJourney(journeyId: string, entityId?: string) {
  const { data: journey } = await (supabase as any)
    .from("cross_service_journeys")
    .select("*")
    .eq("id", journeyId)
    .single();

  if (!journey || journey.status !== "active") return null;

  const steps = journey.steps as JourneyStep[];
  const current = journey.current_step as number;

  // Complete current step
  steps[current].status = "completed";
  steps[current].completedAt = new Date().toISOString();
  if (entityId) steps[current].entityId = entityId;

  const nextStep = current + 1;
  const isComplete = nextStep >= steps.length;

  if (!isComplete) {
    steps[nextStep].status = "active";
  }

  const { data, error } = await (supabase as any)
    .from("cross_service_journeys")
    .update({
      steps,
      current_step: isComplete ? current : nextStep,
      status: isComplete ? "completed" : "active",
      completed_at: isComplete ? new Date().toISOString() : null,
    })
    .eq("id", journeyId)
    .select("*")
    .single();

  if (error) throw error;

  // Record signal for the completed step's vertical
  if (journey.user_id) {
    await recordSignal({
      userId: journey.user_id,
      signalType: "order",
      vertical: steps[current].vertical,
      entityId: journeyId,
      entityType: "journey_step",
    });
  }

  return data;
}

/** Get active journeys for a user */
export async function getActiveJourneys(userId: string) {
  const { data } = await (supabase as any)
    .from("cross_service_journeys")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(10);

  return data ?? [];
}
