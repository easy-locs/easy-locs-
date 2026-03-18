import { addLoyaltyEntry } from "@/lib/loyalty/loyalty-core";

export async function redeemPoints(params: {
  loyaltyAccountId: string;
  points: number;
  referenceType?: string;
  referenceId?: string;
}) {
  if (params.points <= 0) throw new Error("Points must be positive");

  return addLoyaltyEntry({
    loyaltyAccountId: params.loyaltyAccountId,
    entryType: "redeem",
    points: -Math.abs(params.points),
    referenceType: params.referenceType,
    referenceId: params.referenceId,
  });
}
