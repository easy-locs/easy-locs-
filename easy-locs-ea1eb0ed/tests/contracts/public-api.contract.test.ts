import { describe, it, expect, beforeAll } from "vitest";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

beforeAll(() => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set to run contract tests");
  }
});

describe("Contract: public-api (requires el_xxx API key)", () => {
  it("rejects missing API key with 401 and exact error message", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/public-api`, {
      method: "GET",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY! },
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("json");
    const body = await res.json();
    expect(body.error).toBe("Missing or invalid API key. Use Authorization: Bearer el_xxx");
  });

  it("rejects non-el_ prefixed Bearer token with 401 and same error", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/public-api`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY!,
        Authorization: "Bearer invalid_token_123",
      },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Missing or invalid API key. Use Authorization: Bearer el_xxx");
  });

  it("rejects invalid el_ key with 401 'Invalid or inactive API key'", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/public-api`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY!,
        Authorization: "Bearer el_fake_key_that_does_not_exist",
      },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid or inactive API key");
  });

  it("CORS preflight returns 200", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/public-api`, {
      method: "OPTIONS",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY! },
    });
    expect(res.status).toBe(200);
  });
});
