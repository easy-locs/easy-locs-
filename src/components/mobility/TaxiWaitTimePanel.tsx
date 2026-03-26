/**
 * TaxiWaitTimePanel — Zone intelligence: wait time, driver count, traffic, surge.
 */
import { tc } from "@/lib/i18n-canonical";
import { cn } from "@/lib/utils";

interface ZoneInfo {
  waitTime: number;
  drivers: number;
  traffic: string;
  surge: number;
}

interface Props {
  zone: ZoneInfo | null;
}

export function TaxiWaitTimePanel({ zone }: Props) {
  if (!zone) return null;

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">{tc("ride.zone_intelligence")}</p>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex justify-between bg-muted/30 rounded-lg px-3 py-2">
          <span className="text-muted-foreground">{tc("ride.wait_time")}</span>
          <span className="font-semibold text-foreground">{zone.waitTime} min</span>
        </div>

        <div className="flex justify-between bg-muted/30 rounded-lg px-3 py-2">
          <span className="text-muted-foreground">{tc("ride.drivers_available")}</span>
          <span className="font-semibold text-foreground">{zone.drivers}</span>
        </div>

        <div className="flex justify-between bg-muted/30 rounded-lg px-3 py-2">
          <span className="text-muted-foreground">{tc("ride.traffic")}</span>
          <span className="font-semibold text-foreground capitalize">{zone.traffic}</span>
        </div>

        {zone.surge > 1 && (
          <div className="flex justify-between bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 border border-amber-200/40">
            <span className="text-amber-700 dark:text-amber-300">Surge</span>
            <span className="font-bold text-amber-700 dark:text-amber-300">×{zone.surge}</span>
          </div>
        )}
      </div>
    </div>
  );
}
