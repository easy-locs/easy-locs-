import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { canAccessV1Module } from "@/lib/v1/v1Access";
import type { AppActorRole, V1CoreModule } from "@/lib/v1/v1CoreTypes";

export default function V1ModuleGate({
  role,
  module,
  fallbackPath = "/home",
  children,
}: {
  role: AppActorRole;
  module: V1CoreModule;
  fallbackPath?: string;
  children: ReactNode;
}) {
  if (!canAccessV1Module(role, module)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
