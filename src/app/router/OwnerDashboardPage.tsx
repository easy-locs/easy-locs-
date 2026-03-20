import { AppPageShell } from "@/components/layout/AppPageShell";
import { OwnerPropertyDashboard } from "@/components/property/OwnerPropertyDashboard";
import { BookingStatusPanel } from "@/components/booking/BookingStatusPanel";
import { RentStatusPanel } from "@/components/property/RentStatusPanel";

export default function OwnerDashboardPage() {
  return (
    <AppPageShell title="Owner Dashboard">
      <div className="flex flex-col gap-6">
        <OwnerPropertyDashboard />
        <BookingStatusPanel />
        <RentStatusPanel />
      </div>
    </AppPageShell>
  );
}
