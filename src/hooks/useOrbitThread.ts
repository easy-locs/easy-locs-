/**
 * useOrbitThread — Hook to interact with context-aware Orbit threads.
 * 
 * Provides:
 * - Thread creation/retrieval for any business object
 * - Wallet operations within thread context
 * - Ghost mode awareness
 * - Action dispatch within threads
 */
import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useGhostMask } from "@/hooks/useGhostMask";
import { toast } from "sonner";
import {
  getOrCreateContextThread,
  injectThreadSystemMessage,
  getContextConfig,
  isActionAvailable,
  type OrbitContextType,
  type ContextThreadRequest,
  type ContextThreadResult,
  type ThreadActionType,
  type ThreadActionPayload,
} from "@/lib/orbit/context-thread-factory";

interface UseOrbitThreadOpts {
  /** Callback to open unified payment drawer */
  openPayment?: (req: {
    amount: number;
    currency?: string;
    title?: string;
    recipientId?: string;
    recipientName?: string;
    contextType?: string;
    contextId?: string | null;
  }) => Promise<{ ok: boolean; transactionId?: string }>;
}

export function useOrbitThread(opts?: UseOrbitThreadOpts) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isGhost } = useGhostMask();
  const [loading, setLoading] = useState(false);

  /**
   * Open or create a context thread and navigate to it
   */
  const openThread = useCallback(async (req: Omit<ContextThreadRequest, "initiatorId"> & { navigateTo?: boolean }) => {
    if (!user?.id) {
      toast.error("Please sign in first");
      return null;
    }

    setLoading(true);
    try {
      const result = await getOrCreateContextThread({
        ...req,
        initiatorId: user.id,
      });

      if (!result) {
        toast.error("Could not open thread");
        return null;
      }

      if (req.navigateTo !== false) {
        navigate(`/client/messages?thread=${result.contextId}`);
      }

      return result;
    } finally {
      setLoading(false);
    }
  }, [user?.id, navigate]);

  /**
   * Execute an action within a thread context
   */
  const executeAction = useCallback(async (
    thread: ContextThreadResult,
    action: ThreadActionPayload,
  ) => {
    if (!user?.id) return;

    const config = getContextConfig(thread.contextType as OrbitContextType);

    // Ghost mode check — block sensitive actions
    if (isGhost && !config.ghostSupported) {
      toast.error("This action is not available in Ghost mode");
      return;
    }

    // Check if action is available for this context type
    if (!isActionAvailable(thread.contextType as OrbitContextType, action.type)) {
      toast.error("Action not available in this context");
      return;
    }

    switch (action.type) {
      case "pay":
        if (opts?.openPayment && action.amount) {
          const result = await opts.openPayment({
            amount: action.amount,
            currency: action.currency || "EUR",
            title: action.label,
            contextType: thread.contextType,
            contextId: thread.contextId,
          });

          if (result.ok) {
            // Inject confirmation into thread
            await injectThreadSystemMessage({
              threadId: thread.threadId,
              orgId: thread.orgId,
              contextType: thread.contextType as OrbitContextType,
              contextId: thread.contextId,
              content: `💚 Payment confirmed: ${action.label}`,
              category: "payment",
              actionPayload: { ...action, completed: true, variant: "success" },
            });
          }
        } else if (action.route) {
          navigate(action.route);
        } else {
          navigate(`/wallet?action=pay`);
        }
        break;

      case "confirm":
      case "cancel":
      case "sign":
        if (action.route) {
          navigate(action.route);
        }
        break;

      case "track":
        if (action.entityId) {
          navigate(`/order/${action.entityId}`);
        } else if (action.route) {
          navigate(action.route);
        }
        break;

      case "view_receipt":
      case "view_document":
        if (action.route) {
          window.open(action.route, "_blank");
        }
        break;

      case "rate":
        if (action.route) navigate(action.route);
        break;

      case "dispute":
        toast.info("Dispute system opening...");
        if (action.route) navigate(action.route);
        break;

      case "refund":
        toast.info("Refund request initiated");
        if (action.route) navigate(action.route);
        break;

      case "schedule":
        if (action.route) navigate(action.route);
        break;

      case "share_location":
        // Trigger location sharing
        toast.info("Sharing location...");
        break;

      case "call":
      case "video_call":
        // Handled by call provider
        break;

      default:
        if (action.route) navigate(action.route);
    }
  }, [user?.id, isGhost, navigate, opts?.openPayment]);

  /**
   * Push a system message with action card into a thread
   */
  const pushAction = useCallback(async (
    thread: ContextThreadResult,
    content: string,
    actionPayload: ThreadActionPayload,
    category?: string,
  ) => {
    return injectThreadSystemMessage({
      threadId: thread.threadId,
      orgId: thread.orgId,
      contextType: thread.contextType as OrbitContextType,
      contextId: thread.contextId,
      content,
      category,
      actionPayload,
    });
  }, []);

  /**
   * Get available actions for a context type
   */
  const getAvailableActions = useCallback((contextType: OrbitContextType): ThreadActionType[] => {
    const config = getContextConfig(contextType);
    if (isGhost && !config.ghostSupported) {
      return []; // No actions in ghost mode for unsupported contexts
    }
    return config.availableActions;
  }, [isGhost]);

  return {
    openThread,
    executeAction,
    pushAction,
    getAvailableActions,
    loading,
    isGhost,
  };
}
