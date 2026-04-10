/**
 * notifications.routing — Canonical notification tap routing.
 * Determines what screen/state to open when a notification is tapped.
 */

export type NotificationRoute =
  | { type: "thread"; conversationId: string }
  | { type: "call"; sessionId: string; mode: "audio" | "video" }
  | { type: "order"; orderId: string }
  | { type: "wallet"; transactionId?: string }
  | { type: "url"; url: string }
  | { type: "none" };

export const NotificationRouting = {
  /** Resolve a route from notification data */
  resolve(data: Record<string, unknown> | undefined): NotificationRoute {
    if (!data) return { type: "none" };

    if (data.type === "message" && typeof data.conversationId === "string") {
      return { type: "thread", conversationId: data.conversationId };
    }

    if (data.type === "call" && typeof data.sessionId === "string") {
      return {
        type: "call",
        sessionId: data.sessionId,
        mode: (data.mode as "audio" | "video") || "audio",
      };
    }

    if (data.type === "order" && typeof data.orderId === "string") {
      return { type: "order", orderId: data.orderId };
    }

    if (data.type === "wallet") {
      return { type: "wallet", transactionId: data.transactionId as string | undefined };
    }

    if (typeof data.url === "string") {
      return { type: "url", url: data.url };
    }

    return { type: "none" };
  },

  /** Get the URL path for a notification route */
  toPath(route: NotificationRoute): string | null {
    switch (route.type) {
      case "thread": return `/orbit?thread=${route.conversationId}`;
      case "call": return `/orbit?call=${route.sessionId}`;
      case "order": return `/orders/${route.orderId}`;
      case "wallet": return `/wallet${route.transactionId ? `?tx=${route.transactionId}` : ""}`;
      case "url": return route.url;
      case "none": return null;
    }
  },
};
