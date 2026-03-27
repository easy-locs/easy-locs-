import { useAuth } from "@/contexts/AuthContext";
import { useOrbitContactsDirectory } from "@/hooks/useOrbitContactsDirectory";
import { OrbitContactsDirectoryPanel } from "@/components/orbit/OrbitContactsDirectoryPanel";

export default function OrbitContactsPageV2() {
  const { user } = useAuth();
  const directory = useOrbitContactsDirectory(user?.id ?? null);

  return (
    <div className="flex flex-col h-full bg-background">
      <OrbitContactsDirectoryPanel
        ownerUserId={user?.id ?? null}
        items={directory.filtered}
        query={directory.query}
        setQuery={directory.setQuery}
        onReload={directory.reload}
      />
    </div>
  );
}
