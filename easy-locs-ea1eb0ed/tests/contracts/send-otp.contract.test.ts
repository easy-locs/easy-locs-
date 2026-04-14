import { describe, it, expect, beforeAll } from "vitest";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

beforeAll(() => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set to run contract tests");
  }
});

describe("Contract: send-otp (public, validates phone+otp fields)", () => {
  it("rejects empty body with 400 and exact error 'phone and otp required'", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY! },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("phone and otp required");
  });

  it("rejects missing otp field with 400", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY! },
      body: JSON.stringify({ phone: "+33612345678" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("phone and otp required");
  });

  it("accepts valid phone+otp payload and returns 200 with success", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY! },
      body: JSON.stringify({ phone: "+33600000000", otp: "123456" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("success");
    expect(body.success).toBe(true);
  });

  it("CORS preflight returns 200", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
      method: "OPTIONS",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY! },
    });
    expect(res.status).toBe(200);
  });
});
