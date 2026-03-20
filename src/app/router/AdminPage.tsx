import { AppPageShell } from "@/components/layout/AppPageShell";
import { AdminPayoutPanel } from "@/components/admin/AdminPayoutPanel";

export default function AdminPage() {
  return (
    <AppPageShell title="Admin">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <AdminPayoutPanel />
      </div>
    </AppPageShell>
  );
}
