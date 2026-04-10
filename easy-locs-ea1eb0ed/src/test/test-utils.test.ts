import { describe, it, expect } from "vitest";
import {
  mockProfile, mockOrg, mockProperty, mockTenant, mockNotification, mockTransaction,
  mockSupabaseResponse, createSpy, createDeferred, waitFor,
  assertDefined, assertSameElements, assertThrows,
} from "@/lib/test-utils";

describe("PASS55 AP — Test Utils", () => {
  it("creates mock profile with defaults", () => {
    const p = mockProfile();
    expect(p.id).toBeTruthy();
    expect(p.full_name).toBe("Test User");
    expect(p.user_type).toBe("owner");
  });

  it("creates mock profile with overrides", () => {
    const p = mockProfile({ full_name: "Custom", user_type: "tenant" });
    expect(p.full_name).toBe("Custom");
    expect(p.user_type).toBe("tenant");
  });

  it("creates mock org, property, tenant, notification, transaction", () => {
    const org = mockOrg();
    const prop = mockProperty(org.id);
    const tenant = mockTenant(org.id);
    const notif = mockNotification(org.owner_user_id as string);
    const tx = mockTransaction(org.owner_user_id as string);
    expect(prop.org_id).toBe(org.id);
    expect(tenant.org_id).toBe(org.id);
    expect(notif.user_id).toBe(org.owner_user_id);
    expect(tx.currency).toBe("LOCS");
  });

  it("mockSupabaseResponse returns correct shape", () => {
    const ok = mockSupabaseResponse([{ id: "1" }]);
    expect(ok.data).toHaveLength(1);
    expect(ok.error).toBeNull();
    expect(ok.status).toBe(200);

    const err = mockSupabaseResponse(null, { message: "Not found" });
    expect(err.error?.message).toBe("Not found");
    expect(err.status).toBe(400);
  });

  it("createSpy records calls", () => {
    const spy = createSpy((a: number, b: number) => a + b);
    spy(1, 2);
    spy(3, 4);
    expect(spy.callCount).toBe(2);
    expect(spy.lastCall).toEqual([3, 4]);
    spy.reset();
    expect(spy.callCount).toBe(0);
  });

  it("createDeferred controls async flow", async () => {
    const d = createDeferred<string>();
    let result = "";
    d.promise.then((v) => { result = v; });
    d.resolve("done");
    await d.promise;
    expect(result).toBe("done");
  });

  it("waitFor resolves when predicate is true", async () => {
    let ready = false;
    setTimeout(() => { ready = true; }, 50);
    await waitFor(() => ready, { timeout: 1000 });
    expect(ready).toBe(true);
  });

  it("assertDefined throws on null/undefined", () => {
    expect(() => assertDefined(null)).toThrow();
    expect(() => assertDefined(undefined)).toThrow();
    expect(() => assertDefined("ok")).not.toThrow();
  });

  it("assertSameElements works order-independently", () => {
    expect(() => assertSameElements([3, 1, 2], [1, 2, 3])).not.toThrow();
    expect(() => assertSameElements([1, 2], [1, 3])).toThrow();
  });

  it("assertThrows validates error messages", () => {
    const err = assertThrows(() => { throw new Error("bad input"); }, "bad");
    expect(err.message).toContain("bad");
    expect(() => assertThrows(() => {})).toThrow("Expected function to throw");
  });
});
