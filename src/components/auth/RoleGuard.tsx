import { ReactNode } from "react";

export default function RoleGuard({
  allow,
  fallback,
  children,
}: {
  allow: string[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  // In production, check user role from workspace membership
  // For now, render children (role check placeholder)
  return <>{children}</>;
}
