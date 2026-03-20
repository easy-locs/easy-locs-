import type { AppActorRole, V1CoreModule } from "@/lib/v1/v1CoreTypes";
import { V1_ACCESS_RULES } from "@/lib/v1/v1CoreTypes";

export function canAccessV1Module(role: AppActorRole, module: V1CoreModule) {
  const rule = V1_ACCESS_RULES.find((r) => r.module === module);
  if (!rule) return false;
  return rule.allowedRoles.includes(role);
}

export function resolveActorRole(input: {
  userId?: string | null;
  isAdmin?: boolean;
  isMerchant?: boolean;
  isDriver?: boolean;
}): AppActorRole {
  if (!input.userId) return "guest";
  if (input.isAdmin) return "admin";
  if (input.isMerchant) return "merchant";
  if (input.isDriver) return "driver";
  return "customer";
}
