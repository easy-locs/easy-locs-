/**
 * useSecurityDialogs — Security panel, safety number, and encryption state.
 * Extracted from HudChatPanel monolith.
 */
import { useState } from "react";
import type { SecurityLevel } from "@/lib/message-security";

export function useSecurityDialogs() {
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>("normal");
  const [showSafetyNumber, setShowSafetyNumber] = useState(false);
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [viewOnceNext, setViewOnceNext] = useState(false);
  const [disappearTTL, setDisappearTTL] = useState("off");

  return {
    securityLevel, setSecurityLevel,
    showSafetyNumber, setShowSafetyNumber,
    showSecurityPanel, setShowSecurityPanel,
    showLocationPicker, setShowLocationPicker,
    showAttachMenu, setShowAttachMenu,
    viewOnceNext, setViewOnceNext,
    disappearTTL, setDisappearTTL,
  };
}
