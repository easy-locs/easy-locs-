import { AppPageShell } from "@/components/layout/AppPageShell";
import { PropertyList } from "@/components/property/PropertyList";
import { PropertyDetailPanel } from "@/components/property/PropertyDetailPanel";

export default function PropertiesPage() {
  return (
    <AppPageShell title="Properties">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PropertyList />
        <div>
          <PropertyDetailPanel />
        </div>
      </div>
    </AppPageShell>
  );
}
