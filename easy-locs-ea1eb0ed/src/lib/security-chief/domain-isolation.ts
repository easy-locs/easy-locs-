import type { SecurityDomain } from "./types";

export function assertDomainIsolation(from: SecurityDomain, to: SecurityDomain): true {
  if (from === to) return true;

  if (from === "wallet" && to !== "wallet") {
    throw new Error("Wallet domain cannot bridge to another domain");
  }

  if (from === "ghost" && to === "wallet") {
    throw new Error("Ghost domain cannot bridge into wallet domain");
  }

  return true;
}
