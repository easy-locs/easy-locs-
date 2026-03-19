import React from "react";
import { useUiEngine } from "@/hooks/useUiEngine";
import { UiEngineOverlay } from "./UiEngineOverlay";

export function UiEngineMount() {
  const { report, execute } = useUiEngine({
    enabled: true,
    autoRun: true,
    delayMs: 700,
    observeDom: true,
  });

  if (window.location.pathname.startsWith("/admin")) return null;

  return <UiEngineOverlay report={report} onRun={execute} />;
}
