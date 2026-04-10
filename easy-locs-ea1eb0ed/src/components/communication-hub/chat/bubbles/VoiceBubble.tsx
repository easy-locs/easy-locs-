/**
 * VoiceBubble — Re-export of VoiceMessageBubble with attachment-aware props.
 * Bridges between the OrbitAttachment data and the existing VoiceMessageBubble component.
 */
import { memo } from "react";
import VoiceMessageBubble from "@/components/communication/VoiceMessageBubble";
import { BubbleProgressRing } from "../BubbleProgressRing";

interface Props {
  /** Local blob URL or remote URL */
  src: string;
  durationSeconds: number;
  isMe: boolean;
  messageId: string;
  uploadProgress?: number;
  uploadStatus?: string;
}

function VoiceBubbleInner({ src, durationSeconds, isMe, messageId, uploadProgress, uploadStatus }: Props) {
  const isUploading = uploadStatus === "uploading" || uploadStatus === "queued" || uploadStatus === "local";

  return (
    <div className="relative">
      <VoiceMessageBubble
        url={src}
        durationSeconds={durationSeconds}
        isMe={isMe}
        messageId={messageId}
        status={isUploading ? "sending" : "sent"}
      />
      {/* Upload progress overlay for voice */}
      {isUploading && uploadProgress != null && uploadProgress < 1 && (
        <div className="absolute top-1 right-1">
          <BubbleProgressRing progress={uploadProgress * 100} size={20} />
        </div>
      )}
    </div>
  );
}

export const VoiceBubble = memo(VoiceBubbleInner);
VoiceBubble.displayName = "VoiceBubble";
