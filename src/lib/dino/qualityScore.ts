/**
 * DINO Quality Score — Compute weighted quality scores for routes/entities.
 */

export interface QualityInput {
  ui: number;
  ux: number;
  stability: number;
  media: number;
  i18n: number;
  category: number;
}

export function computeQualityScore(input: QualityInput) {
  const total = Math.round(
    input.ui * 0.2 +
    input.ux * 0.2 +
    input.stability * 0.2 +
    input.media * 0.15 +
    input.i18n * 0.15 +
    input.category * 0.1
  );

  return {
    ui_score: input.ui,
    ux_score: input.ux,
    stability_score: input.stability,
    media_score: input.media,
    i18n_score: input.i18n,
    category_score: input.category,
    total_score: total,
  };
}

export function scoreGrade(total: number): "A" | "B" | "C" | "D" | "F" {
  if (total >= 90) return "A";
  if (total >= 75) return "B";
  if (total >= 60) return "C";
  if (total >= 40) return "D";
  return "F";
}
