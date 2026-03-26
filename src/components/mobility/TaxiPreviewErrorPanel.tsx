/**
 * TaxiPreviewErrorPanel — Shows dispatch errors (no drivers, failures).
 */
import React from "react";
import { tc } from "@/lib/i18n-canonical";

export function TaxiPreviewErrorPanel({
  noDrivers,
  failed,
  message,
}: {
  noDrivers?: boolean;
  failed?: boolean;
  message?: string;
}) {
  if (!noDrivers && !failed && !message) return null;

  return (
    <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive font-medium text-center">
      {message ||
        (noDrivers
          ? tc("ride.no_drivers_available")
          : failed
            ? tc("ride.request_failed")
            : tc("common.error"))}
    </div>
  );
}
