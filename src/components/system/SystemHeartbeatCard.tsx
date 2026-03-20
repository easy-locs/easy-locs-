import { useEffect, useState } from "react";

export function SystemHeartbeatCard() {
  const [status, setStatus] = useState<"ok" | "slow" | "down">("ok");

  useEffect(() => {
    const interval = setInterval(() => {
      const rand = Math.random();
      if (rand > 0.9) setStatus("down");
      else if (rand > 0.7) setStatus("slow");
      else setStatus("ok");
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const cls =
    status === "ok"
      ? "bg-emerald-500/10 text-emerald-500"
      : status === "slow"
        ? "bg-amber-500/10 text-amber-500"
        : "bg-destructive/10 text-destructive";

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground mb-2">
        System Heartbeat
      </p>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">API Status</p>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}>
          {status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
