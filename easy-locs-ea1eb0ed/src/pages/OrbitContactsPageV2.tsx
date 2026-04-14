import OrbitContactsDirectory from "@/components/orbit/OrbitContactsDirectory";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function OrbitContactsPageV2() {
  useUiEngine({ enabled: true, autoRun: true, observeDom: true });
  return (
    <SubPageShell>
      <div className="flex flex-col h-full bg-background">
        <OrbitContactsDirectory />
      </div>
    </SubPageShell>
  );
}
