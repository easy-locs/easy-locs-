import { describe, it, expect, beforeAll } from "vitest";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

beforeAll(() => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set to run contract tests");
  }
});

const headers = () => ({
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY!,
  Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
});

describe("Contract: health-check (public, no auth required)", () => {
  it("returns 200 with status field as healthy|degraded|unhealthy", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/health-check`, {
      method: "POST",
      headers: headers(),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(["healthy", "degraded", "unhealthy"]).toContain(body.status);
  });

  it("returns checks array with typed items {name:string, status:string, ms:number}", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/health-check`, {
      method: "POST",
      headers: headers(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.checks)).toBe(true);
    expect(body.checks.length).toBeGreaterThan(0);
    for (const check of body.checks) {
      expect(typeof check.name).toBe("string");
      expect(check.name.length).toBeGreaterThan(0);
      expect(typeof check.status).toBe("string");
      expect(typeof check.ms).toBe("number");
      expect(check.ms).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns totalMs as a non-negative number", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/health-check`, {
      method: "POST",
      headers: headers(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.totalMs).toBe("number");
    expect(body.totalMs).toBeGreaterThanOrEqual(0);
  });

  it("CORS preflight returns 200 with null body", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/health-check`, {
      method: "OPTIONS",
      headers: headers(),
    });
    expect(res.status).toBe(200);
  });
});
