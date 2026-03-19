import type { UiEngineReport } from "./types";

export async function pushUiReportToDino(report: UiEngineReport) {
  try {
    console.log("[UI-ENGINE → DINO]", report);
  } catch (err) {
    console.error("[UI-ENGINE → DINO] failed", err);
  }
}
