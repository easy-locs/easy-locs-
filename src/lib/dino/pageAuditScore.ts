/**
 * DINO Page Audit Score — Compute per-page quality scores from client-side audit beacons.
 */

export interface PageAuditPayload {
  route: string;
  pageKey?: string;
  hasOverflowX: boolean;
  overlapDetected: boolean;
  flickerDetected: boolean;
  imageShiftDetected: boolean;
  tinyTapTargets: boolean;
  dottedLabels: string[];
  untranslatedKeys: string[];
  missingBackButton: boolean;
}

export function scorePageAudit(payload: PageAuditPayload) {
  let ui = 100;
  let ux = 100;
  let stability = 100;
  let i18n = 100;
  let media = 100;
  const category = 100;

  if (payload.hasOverflowX) ui -= 20;
  if (payload.overlapDetected) ui -= 25;
  if (payload.tinyTapTargets) ux -= 20;
  if (payload.missingBackButton) ux -= 10;
  if (payload.flickerDetected) stability -= 35;
  if (payload.imageShiftDetected) media -= 25;
  if (payload.dottedLabels.length > 0) i18n -= 20;
  if (payload.untranslatedKeys.length > 0) i18n -= 25;

  const total = Math.max(
    0,
    Math.round(ui * 0.2 + ux * 0.2 + stability * 0.25 + media * 0.15 + i18n * 0.15 + category * 0.05)
  );

  return { ui, ux, stability, media, i18n, category, total };
}
