import BrowserRepairLivePanel from "@/components/admin/BrowserRepairLivePanel";

export default function AdminBrowserRepairPage() {
  return (
    <div className="min-h-screen bg-background p-4 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Browser User Repair</h1>
        <p className="text-sm text-muted-foreground">Live front incidents, repair runs, dead clicks, timeouts, route failures.</p>
      </div>
      <BrowserRepairLivePanel />
    </div>
  );
}
