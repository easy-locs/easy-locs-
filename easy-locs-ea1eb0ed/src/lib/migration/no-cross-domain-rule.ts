export function assertNoCrossDomainMix(params: {
  from: "orbit_core" | "tenant_portal" | "client_portal" | "delivery";
  to: "orbit_core" | "tenant_portal" | "client_portal" | "delivery";
}) {
  if (params.from === "orbit_core" && params.to !== "orbit_core") {
    return;
  }

  if (params.from !== params.to) {
    console.warn(
      `[NO_CROSS_DOMAIN_RULE] Cross-domain import detected: ${params.from} -> ${params.to}`
    );
  }
}
