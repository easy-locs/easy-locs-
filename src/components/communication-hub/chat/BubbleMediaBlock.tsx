/**
 * BubbleMediaBlock — Isolated media rendering for message bubbles.
 * Memoized: only rerenders when attachment_url or view_once changes.
 */
import { memo } from "react";
import ChatMediaPreview from "@/components/communication/ChatMediaPreview";
import ViewOnceMedia from "@/components/communication-hub/ViewOnceMedia";

interface Props {
  messageId: string;
  attachmentUrl: string | null;
  isMe: boolean;
  isViewOnce: boolean;
  viewOnceOpenedAt?: string | null;
  viewOnceOpenedBy?: string | null;
  currentUserId?: string;
  blurred?: boolean;
}

function BubbleMediaBlockInner({
  messageId, attachmentUrl, isMe, isViewOnce,
  viewOnceOpenedAt, viewOnceOpenedBy, currentUserId, blurred,
}: Props) {
  if (!attachmentUrl) return null;

  if (isViewOnce) {
    return (
      <div className="mb-1">
        <ViewOnceMedia
          messageId={messageId}
          attachmentUrl={attachmentUrl}
          isMe={isMe}
          viewOnceOpenedAt={viewOnceOpenedAt}
          viewOnceOpenedBy={viewOnceOpenedBy}
          currentUserId={currentUserId}
        />
      </div>
    );
  }

  return (
    <div className={`mb-1 -mx-1 rounded-lg overflow-hidden ${blurred ? "blur-lg transition-all" : ""}`}>
      <ChatMediaPreview url={attachmentUrl} />
    </div>
  );
}

export const BubbleMediaBlock = memo(BubbleMediaBlockInner);
BubbleMediaBlock.displayName = "BubbleMediaBlock";
