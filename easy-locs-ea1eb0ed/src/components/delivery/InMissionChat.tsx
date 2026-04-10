/**
 * InMissionChat — Now opens the Orbit shell for the delivery conversation.
 * No longer renders an inline chat; navigates to /orbit/:conversationId.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  jobId: string;
  sellerId: string;
  driverId: string;
  onClose?: () => void;
  className?: string;
}

export default function InMissionChat({ jobId, onClose, className }: Props) {
  const navigate = useNavigate();
  const conversationId = `delivery_chat_${jobId}`;

  const openInOrbit = () => {
    navigate(`/orbit/${conversationId}`);
  };

  return (
    <div className={`rounded-xl overflow-hidden flex flex-col items-center justify-center gap-3 p-6 ${className || ""}`}
      style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.12)", minHeight: 120 }}>
      <MessageCircle className="h-5 w-5" style={{ color: "hsl(var(--hud-cyan))" }} />
      <p className="text-xs text-center" style={{ color: "hsl(var(--hud-text-dim))" }}>
        Mission chat is now in Orbit
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={openInOrbit} className="gap-1.5 text-xs">
          <ExternalLink className="h-3 w-3" /> Open in Orbit
        </Button>
        {onClose && (
          <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
