import OrbitContactsDirectory from "@/components/orbit/OrbitContactsDirectory";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function OrbitContactsPage() {
  useUiEngine({ enabled: true, autoRun: true, observeDom: true });
  return (
    <SubPageShell>
      <ErrorBoundary>
      <div className="flex flex-col h-full bg-background">
        <OrbitContactsDirectory />
      </div>
      </ErrorBoundary>
    </SubPageShell>
  );
}
