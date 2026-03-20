export type AppNotificationType =
  | "booking"
  | "payment"
  | "rent"
  | "message"
  | "system";

export interface AppNotificationRecord {
  id: string;
  orbitId: string;
  type: AppNotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
