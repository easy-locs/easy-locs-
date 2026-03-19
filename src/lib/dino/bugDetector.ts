/**
 * DINO V5 — Auto Bug Detection + Patch Suggestion
 * Detects UI bugs from audit data and suggests fix patches.
 */

export interface DetectedBug {
  id: string;
  route: string;
  bugType: "overflow" | "flicker" | "overlap" | "missing_element" | "broken_layout" | "image_shift" | "tiny_target";
  severity: "critical" | "major" | "minor";
  description: string;
  autoFixable: boolean;
  suggestedPatch?: string;
}

export function detectBugsFromAudit(audit: {
  route: string;
  hasOverflowX: boolean;
  overlapDetected: boolean;
  flickerDetected: boolean;
  imageShiftDetected: boolean;
  tinyTapTargets: boolean;
  missingBackButton: boolean;
}): DetectedBug[] {
  const bugs: DetectedBug[] = [];
  const id = () => crypto.randomUUID();

  if (audit.hasOverflowX) {
    bugs.push({
      id: id(), route: audit.route, bugType: "overflow", severity: "major",
      description: "Horizontal overflow detected — content exceeds viewport width",
      autoFixable: true,
      suggestedPatch: "Add overflow-x-hidden to page container or fix wide element",
    });
  }

  if (audit.overlapDetected) {
    bugs.push({
      id: id(), route: audit.route, bugType: "overlap", severity: "major",
      description: "Element overlap detected — z-index or positioning conflict",
      autoFixable: false,
      suggestedPatch: "Review z-index layers and position values on overlapping elements",
    });
  }

  if (audit.flickerDetected) {
    bugs.push({
      id: id(), route: audit.route, bugType: "flicker", severity: "critical",
      description: "Layout flicker detected — content jumping during render",
      autoFixable: false,
      suggestedPatch: "Add skeleton loaders or fix layout shift from async content",
    });
  }

  if (audit.imageShiftDetected) {
    bugs.push({
      id: id(), route: audit.route, bugType: "image_shift", severity: "minor",
      description: "Image layout shift — images loading without reserved dimensions",
      autoFixable: true,
      suggestedPatch: "Add aspect-ratio or explicit width/height to image containers",
    });
  }

  if (audit.tinyTapTargets) {
    bugs.push({
      id: id(), route: audit.route, bugType: "tiny_target", severity: "minor",
      description: "Touch targets smaller than 36px — accessibility issue",
      autoFixable: true,
      suggestedPatch: "Increase button/link min size to 44px for WCAG compliance",
    });
  }

  if (audit.missingBackButton) {
    bugs.push({
      id: id(), route: audit.route, bugType: "missing_element", severity: "minor",
      description: "Missing back button on detail/nested page",
      autoFixable: true,
      suggestedPatch: "Add back navigation button to page header",
    });
  }

  return bugs;
}
