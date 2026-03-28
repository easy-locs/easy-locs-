/**
 * merchant.status — Operational status tracking.
 */

export type MerchantOperationalStatus =
  | "open"
  | "closed"
  | "temporarily_closed"
  | "coming_soon"
  | "permanently_closed";

export interface MerchantStatus {
  operational: MerchantOperationalStatus;
  acceptingOrders: boolean;
  lastActiveAt?: string;
  openingHours?: WeeklyHours;
}

export interface WeeklyHours {
  mon?: DayHours;
  tue?: DayHours;
  wed?: DayHours;
  thu?: DayHours;
  fri?: DayHours;
  sat?: DayHours;
  sun?: DayHours;
}

export interface DayHours {
  open: string;  // "09:00"
  close: string; // "22:00"
  closed?: boolean;
}

export function isCurrentlyOpen(status: MerchantStatus): boolean {
  return status.operational === "open" && status.acceptingOrders;
}
