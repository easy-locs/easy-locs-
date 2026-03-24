import { useEffect } from "react";
import { installPlatformReactions } from "@/core/bootstrap/install-platform-reactions";
import { useOrbitStore } from "@/stores/orbitStore";
import { runArchitectureAudit, printAuditReport } from "@/lib/guards";

type Props = {
  children: React.ReactNode;
};

export function AppBootstrap({ children }: Props) {
  useEffect(() => {
    installPlatformReactions();

    // Sprint 6: Architecture audit in dev mode
    if (import.meta.env.DEV) {
      setTimeout(() => {
        const violations = runArchitectureAudit();
        printAuditReport(violations);
      }, 3000);
    }
  }, []);

  return <>{children}</>;
}
