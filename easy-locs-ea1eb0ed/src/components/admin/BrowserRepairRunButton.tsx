import { useState } from "react";
import { toast } from "sonner";
import { triggerBrowserRepairRun } from "@/lib/watchdog/browserRepairClient";

type Props = {
  scope?: string;
};

export function BrowserRepairRunButton({ scope = "full" }: Props) {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    try {
      setLoading(true);
      const result = await triggerBrowserRepairRun(scope);
      toast.success(
        `Browser repair finished — scenarios: ${result?.scenarios ?? 0}, fail: ${result?.fail ?? 0}, fixed: ${result?.fixed ?? 0}`
      );
    } catch (e: any) {
      toast.error(e?.message || "Browser repair failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={loading}
      className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition"
    >
      {loading ? "Running..." : "Run Browser Repair"}
    </button>
  );
}
