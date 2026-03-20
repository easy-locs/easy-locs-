import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useV1SessionContext } from "@/hooks/useV1SessionContext";

export function V1RequireMerchant({ children }: { children: (ctx: { merchantId: string; merchantName: string | null }) => ReactNode }) {
  const { data, isLoading } = useV1SessionContext();

  if (isLoading) {
    return <div className="max-w-md mx-auto px-4 py-4"><div className="h-24 rounded-[28px] bg-muted/40 animate-pulse" /></div>;
  }

  if (!data?.merchantId && data?.role !== "admin") {
    return <Navigate to="/home" replace />;
  }

  return <>{children({ merchantId: data?.merchantId || "", merchantName: data?.merchantName || null })}</>;
}
