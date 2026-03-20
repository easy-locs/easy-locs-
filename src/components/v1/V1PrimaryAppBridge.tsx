import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useResolvedV1Actor } from "@/hooks/useResolvedV1Actor";
import type { V1CoreModule } from "@/lib/v1/v1CoreTypes";
import V1ModuleGate from "@/components/v1/V1ModuleGate";
import { V1AppShell } from "@/components/v1/V1AppShell";

export function V1PrimaryAppBridge({
  module,
  children,
  requireMerchantContext = false,
}: {
  module: V1CoreModule;
  children: (ctx: {
    role: "guest" | "customer" | "merchant" | "driver" | "admin";
    merchantId: string | null;
    driverUserId: string | null;
    isAdmin: boolean;
  }) => ReactNode;
  requireMerchantContext?: boolean;
}) {
  const { data, isLoading } = useResolvedV1Actor();

  if (isLoading) {
    return (
      <V1AppShell>
        <div className="max-w-md mx-auto px-4 py-4 space-y-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-[28px] bg-muted/40 h-24 animate-pulse" />
            ))}
          </div>
        </div>
      </V1AppShell>
    );
  }

  const actor = data ?? {
    role: "guest" as const,
    merchantId: null,
    driverUserId: null,
    isAdmin: false,
  };

  if (requireMerchantContext && !actor.merchantId && actor.role !== "admin") {
    return <Navigate to="/home" replace />;
  }

  return (
    <V1ModuleGate role={actor.role} module={module}>
      <V1AppShell>{children(actor)}</V1AppShell>
    </V1ModuleGate>
  );
}
