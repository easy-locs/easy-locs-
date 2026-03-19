/**
 * Merchant Activation Funnel Optimizer
 * Enhances conversion with demand signals and pre-filled data.
 */
import { computeDemandScore } from "./demand-engine";

export interface ActivationContext {
  merchantProfileId: string;
  demandScore: number;
  visitorCount: number;
  interestedCustomers: number;
  suggestedCTA: string;
}

export async function buildActivationContext(merchantProfileId: string): Promise<ActivationContext> {
  const demand = await computeDemandScore(merchantProfileId, "merchant");

  const suggestedCTA = demand.demandScore > 50
    ? `🔥 ${demand.pageViews} people visited your store — activate now!`
    : demand.waitlistSignups > 0
    ? `${demand.waitlistSignups} customers waiting for you — go live today!`
    : "Join Easy-Locs and start receiving orders";

  return {
    merchantProfileId,
    demandScore: demand.demandScore,
    visitorCount: demand.pageViews,
    interestedCustomers: demand.waitlistSignups + demand.notifyRequests,
    suggestedCTA,
  };
}
