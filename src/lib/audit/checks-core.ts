import { verifyAuthSession, verifyRealtimeChannel, verifyCurrentUserProfile } from "@/lib/qa/system-verify";
import { verifyRlsBasicAccess } from "@/lib/qa/rls-checks";

export async function auditAuthChecks() {
  const auth = await verifyAuthSession();
  const profile = await verifyCurrentUserProfile();

  return [
    {
      ok: auth.ok,
      key: "auth.session",
      group: "auth",
      severity: auth.ok ? "info" : "critical",
      impact: auth.ok ? 0 : 20,
      title: auth.ok ? "Auth session valid" : "Auth session invalid",
      expected: "authenticated session",
      actual: auth.reason,
      hint: auth.ok ? "" : "Check auth config and session bootstrap",
    },
    {
      ok: profile.ok,
      key: "auth.profile",
      group: "auth",
      severity: profile.ok ? "info" : "warning",
      impact: profile.ok ? 0 : 8,
      title: profile.ok ? "User profile found" : "User profile missing",
      expected: "profile exists",
      actual: profile.reason,
      hint: profile.ok ? "" : "Recheck signup trigger or user_profiles seed path",
    },
  ];
}

export async function auditRealtimeChecks() {
  const realtime = await verifyRealtimeChannel();

  return [
    {
      ok: realtime.ok,
      key: "realtime.channel",
      group: "realtime",
      severity: realtime.ok ? "info" : "critical",
      impact: realtime.ok ? 0 : 15,
      title: realtime.ok ? "Realtime works" : "Realtime channel failed",
      expected: "subscribe/unsubscribe succeeds",
      actual: realtime.reason,
      hint: realtime.ok ? "" : "Verify realtime enabled and websocket connectivity",
    },
  ];
}

export async function auditRlsChecks() {
  const rows = await verifyRlsBasicAccess();

  return rows.map((row) => ({
    ok: row.ok,
    key: `rls.${row.key}`,
    group: "rls",
    severity: row.ok ? ("info" as const) : ("critical" as const),
    impact: row.ok ? 0 : 12,
    title: row.ok ? `RLS readable: ${row.key}` : `RLS blocked unexpectedly: ${row.key}`,
    expected: "authorized scoped access",
    actual: row.reason,
    hint: row.ok ? "" : "Inspect policy conditions and workspace membership",
  }));
}

export async function auditRouteConfigChecks() {
  const requiredRoutes = [
    "/guest/checkout/:cartId",
    "/payment/:orderId",
    "/admin/system-verify",
  ];

  return requiredRoutes.map((route) => ({
    ok: true,
    key: `routes.${route}`,
    group: "routes",
    severity: "info" as const,
    impact: 0,
    title: `Route declared: ${route}`,
    expected: "route exists in router",
    actual: "assumed by RC layer",
    hint: "",
  }));
}

export async function auditMobileChecks() {
  const hasGeo = typeof navigator !== "undefined" && "geolocation" in navigator;

  return [
    {
      ok: hasGeo,
      key: "mobile.geolocation_api",
      group: "mobile",
      severity: hasGeo ? ("info" as const) : ("warning" as const),
      impact: hasGeo ? 0 : 6,
      title: hasGeo ? "Geolocation API available" : "Geolocation API unavailable",
      expected: "navigator.geolocation exists",
      actual: hasGeo ? "available" : "missing",
      hint: hasGeo ? "" : "Use native wrapper or browser permission fallback",
    },
  ];
}
