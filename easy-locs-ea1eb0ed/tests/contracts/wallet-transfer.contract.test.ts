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

describe("Contract: wallet-transfer (requires user JWT via getUser)", () => {
  it("rejects anon key (not a valid user JWT) with 401", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/wallet-transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
      },
      body: JSON.stringify({ to_user_id: "uuid", amount: 100, currency: "EUR" }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("json");
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("authenticated request with valid JWT returns non-401 status", async () => {
    if (!userJwt) {
      console.warn("Skipping: CONTRACT_TEST_EMAIL/PASSWORD not set");
      return;
    }
    const res = await fetch(`${SUPABASE_URL}/functions/v1/wallet-transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${userJwt}`,
      },
      body: JSON.stringify({ to_user_id: "00000000-0000-0000-0000-000000000000", amount: 0.01, currency: "EUR" }),
    });
    expect(res.status).not.toBe(401);
    expect(res.headers.get("content-type")).toContain("json");
  });

  it("CORS preflight returns 200", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/wallet-transfer`, {
      method: "OPTIONS",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY! },
    });
    expect(res.status).toBe(200);
  });
});
