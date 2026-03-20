/**
 * Home Layout Engine — Controls block ordering and section priority.
 * Makes the home feed feel smart and context-aware.
 */

export type HomeBlockType =
  | "quick_actions"
  | "recent_conversations"
  | "smart_feed"
  | "nearby"
  | "trending"
  | "promotions"
  | "recent_orders";

export interface HomeBlock {
  type: HomeBlockType;
  priority: number;
  visible: boolean;
}

export interface HomeLayoutConfig {
  role: "customer" | "merchant" | "driver" | "guest";
  hasRecentOrders: boolean;
  hasConversations: boolean;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
}

export function computeHomeLayout(config: HomeLayoutConfig): HomeBlock[] {
  const blocks: HomeBlock[] = [];

  // Always show quick actions first
  blocks.push({ type: "quick_actions", priority: 0, visible: true });

  // Recent conversations for everyone with threads
  if (config.hasConversations) {
    blocks.push({ type: "recent_conversations", priority: 1, visible: true });
  }

  // Recent orders if user has any
  if (config.hasRecentOrders) {
    blocks.push({ type: "recent_orders", priority: 2, visible: true });
  }

  // Smart feed — contextual suggestions
  blocks.push({ type: "smart_feed", priority: 3, visible: true });

  // Nearby — always useful
  blocks.push({ type: "nearby", priority: 4, visible: true });

  // Trending — fill rest
  blocks.push({ type: "trending", priority: 5, visible: true });

  // Promotions — lower priority
  blocks.push({ type: "promotions", priority: 6, visible: config.role !== "driver" });

  return blocks.filter((b) => b.visible).sort((a, b) => a.priority - b.priority);
}

/** Time of day helper */
export function getTimeOfDay(): HomeLayoutConfig["timeOfDay"] {
  const h = new Date().getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

/** Greeting text */
export function getGreeting(name?: string): string {
  const tod = getTimeOfDay();
  const greetings: Record<string, string> = {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    night: "Good night",
  };
  const base = greetings[tod];
  return name ? `${base}, ${name}` : base;
}
