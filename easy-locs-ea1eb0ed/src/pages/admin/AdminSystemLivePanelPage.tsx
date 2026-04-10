import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { runDriverAutoDispatch } from "@/lib/system/driverAutoDispatchRunner";
import { runWalletPaymentSync } from "@/lib/system/walletPaymentSyncRunner";
import { getHomeLiveSnapshot } from "@/lib/system/homeLiveDataConnector";
import { installEngineConnectorHub } from "@/lib/system/engineConnectorHub";

export default function AdminSystemLivePanelPage() {
  const navigate = useNavigate();
  const [dispatchResult, setDispatchResult] = useState<any[]>([]);
  const [walletResult, setWalletResult] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const { data: snapshot, refetch } = useQuery({
    queryKey: ["admin-system-live-snapshot"],
    queryFn: () => getHomeLiveSnapshot(),
    staleTime: 5000,
  });

  const installHub = () => {
    installEngineConnectorHub();
    toast.success("Engine connector hub installed");
  };

  const runDispatch = async () => {
    try {
      setBusy(true);
      const res = await runDriverAutoDispatch(50);
      setDispatchResult(res);
      toast.success("Auto-dispatch executed");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Dispatch runner failed");
    } finally {
      setBusy(false);
    }
  };

  const runWalletSync = async () => {
    try {
      setBusy(true);
      const res = await runWalletPaymentSync(50);
      setWalletResult(res);
      toast.success("Wallet sync executed");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Wallet sync failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold">System Live Panel</h1>
          <p className="text-xs text-muted-foreground">Engine connectors and runners</p>
        </div>
      </div>

      <div className="space-y-3">
        <button onClick={installHub} disabled={busy} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50">
          Install Connector Hub
        </button>
        <button onClick={runDispatch} disabled={busy} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50">
          Run Auto Dispatch
        </button>
        <button onClick={runWalletSync} disabled={busy} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50">
          Run Wallet Sync
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/20 bg-card p-4">
          <div className="text-xs text-muted-foreground">Merchants</div>
          <div className="text-lg font-bold mt-1">{snapshot?.featuredMerchants?.length ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-border/20 bg-card p-4">
          <div className="text-xs text-muted-foreground">Promos</div>
          <div className="text-lg font-bold mt-1">{snapshot?.activePromos?.length ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-border/20 bg-card p-4">
          <div className="text-xs text-muted-foreground">Orders</div>
          <div className="text-lg font-bold mt-1">{snapshot?.recentOrders?.length ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-border/20 bg-card p-4">
          <div className="text-xs text-muted-foreground">Dispatch</div>
          <div className="text-lg font-bold mt-1">{dispatchResult.length}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <div className="text-sm font-bold mb-2">Dispatch Result</div>
        <pre className="text-[11px] text-muted-foreground overflow-auto max-h-40">
          {JSON.stringify(dispatchResult, null, 2)}
        </pre>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <div className="text-sm font-bold mb-2">Wallet Sync Result</div>
        <pre className="text-[11px] text-muted-foreground overflow-auto max-h-40">
          {JSON.stringify(walletResult, null, 2)}
        </pre>
      </div>
    </div>
  );
}
