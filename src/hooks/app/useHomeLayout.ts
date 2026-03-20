import { useMemo } from "react";
import { computeHomeLayout, getTimeOfDay, type HomeLayoutConfig } from "@/lib/home/homeLayoutEngine";

interface UseHomeLayoutParams {
  role: HomeLayoutConfig["role"];
  hasRecentOrders: boolean;
  hasConversations: boolean;
}

export function useHomeLayout({ role, hasRecentOrders, hasConversations }: UseHomeLayoutParams) {
  return useMemo(() => {
    const config: HomeLayoutConfig = {
      role,
      hasRecentOrders,
      hasConversations,
      timeOfDay: getTimeOfDay(),
    };
    return computeHomeLayout(config);
  }, [role, hasRecentOrders, hasConversations]);
}
