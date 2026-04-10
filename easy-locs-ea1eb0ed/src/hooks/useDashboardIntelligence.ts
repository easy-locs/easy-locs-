import { useMemo } from "react";
import {
  buildDashboardContext,
  getContinueItems,
  getSuggestedPayments,
  getPendingActions,
  prioritizeSections,
  getContextualGreeting,
  getContextualQuickSuggestion,
  type DashboardContext,
  type ContinueItem,
  type SuggestedPayment,
  type PendingAction,
  type SectionPriority,
} from "@/lib/dashboard/dashboard-intelligence";

export interface DashboardIntelligence {
  context: DashboardContext;
  continueItems: ContinueItem[];
  suggestedPayments: SuggestedPayment[];
  pendingActions: PendingAction[];
  sectionPriorities: SectionPriority[];
  greeting: { greeting: string; emoji: string };
  quickSuggestion: { text: string; route: string; icon: string } | null;
}

export function useDashboardIntelligence(params: {
  userId: string | null;
  hasWallet: boolean;
  walletBalance: number;
  unreadMessages: number;
  activeOrders: number;
  hasProfile: boolean;
  profileComplete: boolean;
  hasOrbit: boolean;
}): DashboardIntelligence {
  const ctx = useMemo(() => buildDashboardContext(params), [
    params.userId,
    params.hasWallet,
    params.walletBalance,
    params.unreadMessages,
    params.activeOrders,
    params.hasProfile,
    params.profileComplete,
    params.hasOrbit,
  ]);

  const continueItems = useMemo(() => getContinueItems(ctx), [ctx]);
  const suggestedPayments = useMemo(() => getSuggestedPayments(ctx), [ctx]);
  const pendingActions = useMemo(() => getPendingActions(ctx), [ctx]);
  const sectionPriorities = useMemo(() => prioritizeSections(ctx), [ctx]);
  const greeting = useMemo(() => getContextualGreeting(ctx), [ctx]);
  const quickSuggestion = useMemo(() => getContextualQuickSuggestion(ctx), [ctx]);

  return {
    context: ctx,
    continueItems,
    suggestedPayments,
    pendingActions,
    sectionPriorities,
    greeting,
    quickSuggestion,
  };
}
