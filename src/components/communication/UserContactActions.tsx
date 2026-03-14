/**
 * UserContactActions — Message / Audio Call / Video Call buttons for any user.
 * Works from profiles, listings, bookings, or anywhere a target user is known.
 */
import { useState } from "react";
import { MessageCircle, Phone, Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCall } from "@/components/call/CallProvider";
import { getOrCreateDirectThread, getDirectContextId } from "@/lib/direct-thread";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  targetUserId: string;
  targetName: string;
  targetOrgId?: string;
  /** Optional context (listing, service, etc.) */
  contextLabel?: string;
  contextType?: string;
  contextId?: string;
  /** Layout variant */
  variant?: "row" | "column" | "compact";
  className?: string;
}

export default function UserContactActions({
  targetUserId, targetName, targetOrgId,
  contextLabel, contextType, contextId,
  variant = "row", className = "",
}: Props) {
  const { user } = useAuth();
  const { startCall, isStartingCall } = useCall();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<"msg" | "audio" | "video" | null>(null);

  if (!user || user.id === targetUserId) return null;

  const resolveThread = async () => {
    // If we have a specific context (listing/booking), use that
    if (contextType && contextId && targetOrgId) {
      return { contextId, orgId: targetOrgId };
    }
    // Otherwise create/find a direct thread
    return getOrCreateDirectThread({
      currentUserId: user.id,
      targetUserId,
      targetName,
    });
  };

  const handleMessage = async () => {
    setLoading("msg");
    try {
      const thread = await resolveThread();
      if (!thread) {
        toast.error("Could not start conversation");
        return;
      }
      navigate(`/client/messages?thread=${thread.contextId}`);
    } catch {
      toast.error("Failed to open conversation");
    }
    setLoading(null);
  };

  const handleCall = async (isVideo: boolean) => {
    const type = isVideo ? "video" : "audio";
    setLoading(type);
    try {
      const thread = await resolveThread();
      if (!thread) {
        toast.error("Could not initiate call");
        setLoading(null);
        return;
      }

      // For direct calls, we need the target user's org
      // or our own org as the callee_org_id
      let calleeOrgId = targetOrgId;
      if (!calleeOrgId) {
        const { data: targetMembership } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", targetUserId)
          .limit(1)
          .single();
        calleeOrgId = targetMembership?.org_id;
      }

      if (!calleeOrgId) {
        toast.error("User is not reachable for calls");
        setLoading(null);
        return;
      }

      await startCall({
        orgId: calleeOrgId,
        threadId: (thread as any).threadId || undefined,
        contextType: contextType || "direct",
        contextId: contextId || thread.contextId,
        contextLabel: contextLabel || `Direct call`,
        peerName: targetName,
        isVideo,
      });
    } catch {
      toast.error("Call failed");
    }
    setLoading(null);
  };

  const isColumn = variant === "column";
  const isCompact = variant === "compact";

  return (
    <div className={`flex ${isColumn ? "flex-col" : ""} gap-2 ${className}`}>
      <Button
        variant="outline"
        size={isCompact ? "sm" : "default"}
        onClick={handleMessage}
        disabled={!!loading || isStartingCall}
        className="gap-2 min-h-[44px]"
      >
        {loading === "msg" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
        {!isCompact && "Message"}
      </Button>
      <Button
        variant="outline"
        size={isCompact ? "sm" : "default"}
        onClick={() => handleCall(false)}
        disabled={!!loading || isStartingCall}
        className="gap-2 min-h-[44px]"
      >
        {loading === "audio" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
        {!isCompact && "Call"}
      </Button>
      <Button
        variant="outline"
        size={isCompact ? "sm" : "default"}
        onClick={() => handleCall(true)}
        disabled={!!loading || isStartingCall}
        className="gap-2 min-h-[44px]"
      >
        {loading === "video" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
        {!isCompact && "Video"}
      </Button>
    </div>
  );
}
