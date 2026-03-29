/**
 * FAMILY: PAYMENTS — Canonical payment flow management.
 * Separate from wallet display. Handles intents, splits, escrow, checkout.
 */
export { usePaymentDialogs } from "@/hooks/usePaymentDialogs";

// Payments family owns: payment intent creation, split handling,
// escrow release, transfer logic, checkout state, QR pay, payment requests
