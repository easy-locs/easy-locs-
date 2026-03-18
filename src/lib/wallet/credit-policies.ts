/**
 * credit-policies — Promo / goodwill / loyalty credit helpers.
 */
import { applyWalletCredit } from "@/lib/wallet/apply-wallet-credit";

export async function issueDisputeGoodwillCredit(params: {
  userId: string;
  rideRequestId: string;
  amount: number;
}) {
  return applyWalletCredit({
    userId: params.userId,
    amount: params.amount,
    direction: "credit",
    reason: "dispute_goodwill",
    contextType: "ride_dispute",
    contextId: params.rideRequestId,
  });
}

export async function issueLoyaltyBonusCredit(params: {
  userId: string;
  amount: number;
}) {
  return applyWalletCredit({
    userId: params.userId,
    amount: params.amount,
    direction: "credit",
    reason: "loyalty_bonus",
    contextType: "loyalty",
    contextId: null,
  });
}

export async function consumeRideCredit(params: {
  userId: string;
  rideRequestId: string;
  amount: number;
}) {
  return applyWalletCredit({
    userId: params.userId,
    amount: params.amount,
    direction: "debit",
    reason: "ride_payment_credit",
    contextType: "ride",
    contextId: params.rideRequestId,
  });
}
