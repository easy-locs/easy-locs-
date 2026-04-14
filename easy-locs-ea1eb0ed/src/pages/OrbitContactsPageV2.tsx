import OrbitContactsDirectory from "@/components/orbit/OrbitContactsDirectory";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function OrbitContactsPageV2() {
  useUiEngine({ enabled: true, autoRun: true, observeDom: true });
  return (
    <div className="flex flex-col h-full bg-background">
      <OrbitContactsDirectory />
    </div>
  );
}
