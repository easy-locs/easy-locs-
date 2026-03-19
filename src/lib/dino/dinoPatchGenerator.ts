/**
 * DINO Patch Generator — Generates structured patch proposals for non-auto-fixable issues.
 */

import type { ClassifiedIssue } from "./dinoIssueClassifier";

export interface PatchProposal {
  issueId: string;
  title: string;
  rootCause: string;
  affectedFiles: string[];
  proposedFix: string;
  expectedResult: string;
  verificationChecklist: string[];
  priority: number;
}

/**
 * Generate patch proposals for issues that need manual or structured intervention.
 */
export function generatePatches(issues: ClassifiedIssue[]): PatchProposal[] {
  const patchable = issues.filter(i => !i.autoFixSafe);

  return patchable.map(issue => {
    const f = issue.finding;
    return {
      issueId: f.id,
      title: f.description,
      rootCause: inferRootCause(f.type, f.description),
      affectedFiles: inferAffectedFiles(f.page, f.type),
      proposedFix: f.fixSuggestion || generateFixSuggestion(f),
      expectedResult: f.expected,
      verificationChecklist: generateChecklist(f),
      priority: issue.priority,
    };
  });
}

function inferRootCause(type: string, description: string): string {
  const causes: Record<string, string> = {
    typography: "Incorrect heading hierarchy or raw translation key leaking into UI",
    responsive: "Missing overflow containment or undersized touch targets",
    stability: "Dynamic content causing layout shift without reserved space",
    image: "Images loaded without explicit dimensions causing reflow",
    routing: "Route definition mismatch or dead navigation path",
    i18n: "Missing translation entry or malformed label key",
    layout: "Inconsistent spacing or grid configuration",
    spacing: "Non-standard gap/padding values used",
    branding: "Off-brand colors or styles applied directly",
    form: "Inconsistent form field sizing or alignment",
    interaction: "Missing or incorrect event handler wiring",
  };
  return causes[type] || "Undetermined — manual inspection required";
}

function inferAffectedFiles(page: string, type: string): string[] {
  const files = [`src/pages/${page.replace(/^\//, "").replace(/\//g, "/")}.tsx`];
  if (type === "branding") files.push("src/index.css", "tailwind.config.ts");
  if (type === "routing") files.push("src/lib/routes.ts", "src/App.tsx");
  if (type === "i18n") files.push("src/lib/i18n.tsx");
  return files;
}

function generateFixSuggestion(f: { type: string; description: string; expected: string }): string {
  return `Update component to match expected: ${f.expected}`;
}

function generateChecklist(f: { page: string; type: string }): string[] {
  return [
    `Open ${f.page} on mobile viewport`,
    `Verify ${f.type} issue is resolved`,
    `Check no layout shift occurs`,
    `Confirm no regression in related pages`,
    `TypeScript compiles clean`,
  ];
}
