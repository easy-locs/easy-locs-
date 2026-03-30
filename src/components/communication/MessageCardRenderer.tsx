/**
 * MessageCardRenderer — Unified card dispatcher based on canonical MessageMode.
 * Single entry point: resolves message mode → delegates to specialized card.
 */
import { memo, useMemo } from "react";
import { resolveMessageMode, type MessageMode } from "@/families/messages/message-mode";
import CallCard from "./CallCard";

interface Props {
  msg: any;
  isMe: boolean;
  currentUserId?: string;
  onCallBack?: () => void;
}

/**
 * Returns the specialized card component for non-standard message types.
 * Returns null for text/media/voice/location which are handled by ChatMessageBubble.
 */
function MessageCardRenderer({ msg, isMe, currentUserId, onCallBack }: Props) {
  const mode = useMemo(() => resolveMessageMode(msg), [msg]);
  const meta = msg.metadata_json || msg.metadata || {};

  // Call cards
  if (mode === "call_audio" || mode === "call_video" || mode === "call_missed" || mode === "call_declined") {
    return (
      <CallCard
        mode={mode}
        isMe={isMe}
        createdAt={msg.created_at}
        durationSeconds={meta?.duration_seconds || 0}
        isVideo={mode === "call_video"}
        callerName={msg.contact_name}
        onCallback={mode === "call_missed" ? onCallBack : undefined}
      />
    );
  }

  // Other specialized cards can be added here:
  // if (mode === "payment_request") return <PaymentRequestCard ... />;
  // if (mode === "payment_receipt") return <PaymentReceiptCard ... />;

  return null;
}

export default memo(MessageCardRenderer);
