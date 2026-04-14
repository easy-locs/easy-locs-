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

describe("Contract: ai-assistant (requires user JWT via getUser)", () => {
  it("rejects anon key as Bearer token with 401", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
      },
      body: JSON.stringify({ prompt: "Hello" }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("json");
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  it("authenticated request with valid JWT passes auth gate (non-401)", async () => {
    if (!userJwt) {
      console.warn("Skipping: CONTRACT_TEST_EMAIL/PASSWORD not set");
      return;
    }
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${userJwt}`,
      },
      body: JSON.stringify({ prompt: "What is Easy-Locs?" }),
    });
    expect(res.status).not.toBe(401);
    expect(res.headers.get("content-type")).toContain("json");
  });

  it("CORS preflight returns 200", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant`, {
      method: "OPTIONS",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY! },
    });
    expect(res.status).toBe(200);
  });
});
