import { describe, it, expect, beforeAll } from "vitest";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

beforeAll(() => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set to run contract tests");
  }
});

describe("Contract: stripe-webhook (requires stripe-signature header)", () => {
  it("rejects POST without stripe-signature with 400 and exact error", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY! },
      body: JSON.stringify({ type: "payment_intent.succeeded", data: { object: {} } }),
    });
    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("json");
    const body = await res.json();
    expect(body.error).toBe("Missing signature or webhook secret");
  });

  it("rejects invalid stripe-signature with 400 and verification-failed error", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY!,
        "stripe-signature": "t=0,v1=invalid_signature",
      },
      body: JSON.stringify({ type: "payment_intent.succeeded", data: { object: {} } }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Webhook signature verification failed");
  });

  it("CORS preflight returns 200", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
      method: "OPTIONS",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY! },
    });
    expect(res.status).toBe(200);
  });
});
