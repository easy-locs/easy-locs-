import RoleGuard from "@/components/auth/RoleGuard";
import { ComponentType } from "react";

export function withRoleGuard<P extends object>(Component: ComponentType<P>, allow: string[]) {
  return function GuardedPage(props: P) {
    return (
      <RoleGuard allow={allow}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}
