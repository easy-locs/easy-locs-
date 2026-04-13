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
  type ProfileFields,
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
  /** Active currency — derived from wallet store when not provided. */
  walletCurrency?: string;
  unreadMessages: number;
  activeOrders: number;
  hasProfile: boolean;
  profileComplete: boolean;
  hasOrbit: boolean;
  /** Actual profile field completeness for real progress calculation. */
  profileFields?: ProfileFields;
}): DashboardIntelligence {
  const ctx = useMemo(() => buildDashboardContext(params), [
    params.userId,
    params.hasWallet,
    params.walletBalance,
    params.walletCurrency,
    params.unreadMessages,
    params.activeOrders,
    params.hasProfile,
    params.profileComplete,
    params.hasOrbit,
    params.profileFields,
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
