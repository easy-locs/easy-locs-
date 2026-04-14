import { describe, it, expect, beforeAll } from "vitest";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

beforeAll(() => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set to run contract tests");
  }
});

describe("Contract: send-push-notification (requires service-role)", () => {
  it("rejects anon key with 403 and 'service role key required' error", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
      },
      body: JSON.stringify({ user_id: "test", title: "Test", body: "Test" }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body.error).toContain("service role");
  });

  it("rejects missing authorization header with 401", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ user_id: "test", title: "Test", body: "Test" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("authorization");
  });
});
