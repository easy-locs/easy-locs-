import { useMemo, useState } from "react";
import type {
  OrbitComposerMode,
  OrbitEditState,
  OrbitForwardState,
  OrbitReplyState,
} from "@/lib/orbit/orbit-message-ui-types";

export function useOrbitComposerState() {
  const [replyState, setReplyState] = useState<OrbitReplyState | null>(null);
  const [editState, setEditState] = useState<OrbitEditState | null>(null);
  const [forwardState, setForwardState] = useState<OrbitForwardState | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const mode: OrbitComposerMode = useMemo(() => {
    if (editState) return "edit";
    if (replyState) return "reply";
    if (forwardState) return "forward";
    if (isRecording) return "recording";
    return "idle";
  }, [editState, replyState, forwardState, isRecording]);

  const resetComposerModes = () => {
    setReplyState(null);
    setEditState(null);
    setForwardState(null);
    setIsRecording(false);
  };

  return {
    mode,
    replyState,
    editState,
    forwardState,
    isRecording,
    setReplyState,
    setEditState,
    setForwardState,
    setIsRecording,
    resetComposerModes,
  };
}
