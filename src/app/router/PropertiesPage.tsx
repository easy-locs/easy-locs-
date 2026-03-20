import { AppPageShell } from "@/components/layout/AppPageShell";
import { PropertyList } from "@/components/property/PropertyList";
import { PropertyDetailPanel } from "@/components/property/PropertyDetailPanel";
import { PropertyGallery } from "@/components/property/PropertyGallery";

export default function PropertiesPage() {
  return (
    <AppPageShell title="Properties">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <PropertyList />
          <PropertyDetailPanel />
        </div>

        <div>
          <PropertyGallery />
        </div>
      </div>
    </AppPageShell>
  );
}
