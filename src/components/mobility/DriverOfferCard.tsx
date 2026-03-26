/**
 * DriverOfferCard — Displays a ride offer for the rider to accept/reject.
 */
import React from "react";
import { tc } from "@/lib/i18n-canonical";

interface Props {
  offer: any;
  onAccept?: () => void;
  onReject?: () => void;
}

export function DriverOfferCard({ offer, onAccept, onReject }: Props) {
  const wave = offer.metadata_json?.wave;
  const score = offer.metadata_json?.score_total;

  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{tc("ride.premium_offer")}</p>
        {wave && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
            Wave {wave}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {tc("ride.pickup_eta_short", { minutes: String(offer.eta_minutes ?? 5) })}
      </p>

      {score != null && (
        <p className="text-xs text-amber-500 font-medium">
          {tc("ride.dispatch_priority")} · {Math.round(score * 100)}%
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
        >
          {tc("mobility.accept")}
        </button>
        <button
          type="button"
          onClick={onReject}
          className="flex-1 h-9 rounded-lg bg-muted text-muted-foreground text-xs font-semibold"
        >
          {tc("common.reject")}
        </button>
      </div>
    </div>
  );
}
