/**
 * MICRON: computeWalletDelta — Computes the balance change for a wallet operation.
 */
export type DeltaDirection = "credit" | "debit";

export interface WalletDelta {
  direction: DeltaDirection;
  amount: number;
  availableDelta: number;
  escrowDelta: number;
}

export function computeWalletDelta(
  type: "topup" | "payment" | "refund" | "transfer_out" | "transfer_in" | "escrow_lock" | "escrow_release",
  amount: number
): WalletDelta {
  switch (type) {
    case "topup":
    case "transfer_in":
    case "refund":
      return { direction: "credit", amount, availableDelta: amount, escrowDelta: 0 };
    case "payment":
    case "transfer_out":
      return { direction: "debit", amount, availableDelta: -amount, escrowDelta: 0 };
    case "escrow_lock":
      return { direction: "debit", amount, availableDelta: -amount, escrowDelta: amount };
    case "escrow_release":
      return { direction: "credit", amount, availableDelta: amount, escrowDelta: -amount };
  }
}
