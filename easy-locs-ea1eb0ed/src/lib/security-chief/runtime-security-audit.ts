import { secureStore } from "./native-secure-store";
import { getSigningIdentityMeta } from "./device-identity";

export interface RuntimeSecurityAuditResult {
  ok: boolean;
  checks: Array<{
    name: string;
    status: "pass" | "warn" | "fail";
    detail: string;
  }>;
}

export async function runRuntimeSecurityAudit(): Promise<RuntimeSecurityAuditResult> {
  const checks: RuntimeSecurityAuditResult["checks"] = [];

  const identity = await getSigningIdentityMeta();
  checks.push({
    name: "Signing identity",
    status: identity ? "pass" : "fail",
    detail: identity ? "Signing identity present" : "Missing signing identity",
  });

  checks.push({
    name: "WebCrypto",
    status: crypto?.subtle ? "pass" : "fail",
    detail: crypto?.subtle ? "crypto.subtle available" : "crypto.subtle missing",
  });

  checks.push({
    name: "Secure storage adapter",
    status: (await secureStore.isAvailable()) ? "pass" : "warn",
    detail: "Secure storage adapter loaded",
  });

  checks.push({
    name: "WebRTC core",
    status: window.RTCPeerConnection ? "pass" : "warn",
    detail: window.RTCPeerConnection ? "RTCPeerConnection available" : "RTCPeerConnection missing",
  });

  checks.push({
    name: "Media capture",
    status: navigator.mediaDevices?.getUserMedia ? "pass" : "warn",
    detail: navigator.mediaDevices?.getUserMedia ? "getUserMedia available" : "getUserMedia missing",
  });

  return {
    ok: !checks.some((c) => c.status === "fail"),
    checks,
  };
}
