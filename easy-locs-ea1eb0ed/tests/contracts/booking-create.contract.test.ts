import { describe, it, expect, beforeAll } from "vitest";
import { getTestUserJwt } from "./helpers/auth";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let userJwt: string | null = null;

beforeAll(async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set to run contract tests");
  }
  if (process.env.CONTRACT_TEST_EMAIL && process.env.CONTRACT_TEST_PASSWORD) {
    userJwt = await getTestUserJwt();
  }
});

describe("Contract: booking-create (requires user JWT via getClaims)", () => {
  it("rejects missing Authorization header with 500 'Missing Authorization header'", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/booking-create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ listingId: "test", checkIn: "2026-05-01", checkOut: "2026-05-05" }),
    });
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toContain("json");
    const body = await res.json();
    expect(body.error).toContain("Authorization");
  });

  it("rejects anon key as Bearer (invalid JWT claims) with 500 'Not authenticated'", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/booking-create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
      },
      body: JSON.stringify({ listingId: "test", checkIn: "2026-05-01", checkOut: "2026-05-05" }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("authenticated");
  });

  it("authenticated request with valid JWT passes auth gate (non-500 auth error)", async () => {
    if (!userJwt) {
      console.warn("Skipping: CONTRACT_TEST_EMAIL/PASSWORD not set");
      return;
    }
    const res = await fetch(`${SUPABASE_URL}/functions/v1/booking-create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${userJwt}`,
      },
      body: JSON.stringify({
        listingId: "00000000-0000-0000-0000-000000000000",
        checkIn: "2026-06-01",
        checkOut: "2026-06-05",
      }),
    });
    const body = await res.json();
    expect(body.error).not.toContain("Authorization");
    expect(body.error).not.toContain("authenticated");
  });

  it("CORS preflight returns 200", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/booking-create`, {
      method: "OPTIONS",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY! },
    });
    expect(res.status).toBe(200);
  });
});
