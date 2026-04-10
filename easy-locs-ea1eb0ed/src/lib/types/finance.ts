export interface RefundRequest {
  id: string;
  booking_id: string | null;
  rent_payment_id: string | null;
  owner_orbit_id: string;
  buyer_or_tenant_orbit_id: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "processed";
  amount: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_refund_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayoutRequest {
  id: string;
  owner_orbit_id: string;
  wallet_id: string;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "rejected" | "paid";
  destination_type: string | null;
  destination_ref: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}
