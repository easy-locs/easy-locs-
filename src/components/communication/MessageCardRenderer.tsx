/**
 * MessageCardRenderer — Unified card dispatcher based on canonical metadata.
 * Single entry point: normalizes raw msg → delegates to specialized card by cardType.
 */
import { memo, useMemo } from "react";
import { normalizeMessage } from "@/families/messages/normalize-message";
import type { CanonicalMessageEnvelope, CanonicalCardType } from "@/families/messages/canonical-envelope";
import CallCard from "./CallCard";
import LocationCard from "./LocationCard";
import PaymentCard from "./PaymentCard";
import SystemCard from "./SystemCard";

interface Props {
  msg: any;
  isMe: boolean;
  currentUserId?: string;
  onCallBack?: () => void;
}

/**
 * Returns the specialized card component for non-standard message types.
 * Returns null for text/media types handled by ChatMessageBubble.
 */
function MessageCardRenderer({ msg, isMe, currentUserId, onCallBack }: Props) {
  const envelope = useMemo(() => normalizeMessage(msg), [msg]);
  const cardType = envelope.metadata.ui?.cardType;

  if (cardType === "call") {
    return <CallCard envelope={envelope} isMe={isMe} onCallback={onCallBack} />;
  }

  if (cardType === "location") {
    return <LocationCard envelope={envelope} isMe={isMe} />;
  }

  if (cardType === "payment") {
    return <PaymentCard envelope={envelope} isMe={isMe} />;
  }

  if (cardType === "system") {
    return <SystemCard envelope={envelope} />;
  }

  return null;
}

export default memo(MessageCardRenderer);
