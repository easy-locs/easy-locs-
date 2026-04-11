import { db } from '@/services/db';
import type { TrustScore, VisibilityState, VisibilityLevel } from './trust-types';

const WEIGHTS = {
  data: 0.20,
  media: 0.20,
  behavior: 0.20,
  review: 0.20,
  reliability: 0.10,
  fraud_inverse: 0.10,
};

export const trustScoreEngine = {
  async compute(businessId: string): Promise<TrustScore> {
    const [dataScore, mediaScore, behaviorScore, reviewScore, reliabilityScore, fraudRisk] = await Promise.all([
      this.computeDataScore(businessId),
      this.computeMediaScore(businessId),
      this.computeBehaviorScore(businessId),
      this.computeReviewScore(businessId),
      this.computeReliabilityScore(businessId),
      this.computeFraudRisk(businessId),
    ]);

    const globalScore = Math.round(
      WEIGHTS.data * dataScore +
      WEIGHTS.media * mediaScore +
      WEIGHTS.behavior * behaviorScore +
      WEIGHTS.review * reviewScore +
      WEIGHTS.reliability * reliabilityScore +
      WEIGHTS.fraud_inverse * (100 - fraudRisk)
    );

    const score: TrustScore = {
      business_id: businessId,
      global_score: Math.min(Math.max(globalScore, 0), 100),
      data_score: dataScore,
      media_score: mediaScore,
      behavior_score: behaviorScore,
      review_score: reviewScore,
      reliability_score: reliabilityScore,
      fraud_risk_score: fraudRisk,
      last_updated_at: new Date().toISOString(),
    };

    await db('trust_score').upsert(score);
    await this.updateVisibility(businessId, score.global_score);

    return score;
  },

  async computeDataScore(businessId: string): Promise<number> {
    const { data } = await db('business_quality_score').select('completeness_score, consistency_score').eq('business_id', businessId).single();
    if (!data) return 30;
    const d = data as { completeness_score: number; consistency_score: number };
    return Math.round((d.completeness_score * 0.6 + d.consistency_score * 0.4));
  },

  async computeMediaScore(businessId: string): Promise<number> {
    const { data } = await db('media_assets').select('quality_score, category_match_score').eq('business_id', businessId);
    const assets = data ?? [];
    if (assets.length === 0) return 0;

    const avgQ = assets.reduce((s: number, a: { quality_score: number }) => s + (a.quality_score ?? 0), 0) / assets.length;
    const avgM = assets.reduce((s: number, a: { category_match_score: number }) => s + (a.category_match_score ?? 0), 0) / assets.length;
    const diversityBonus = Math.min(assets.length * 5, 20);

    return Math.min(Math.round(avgQ * 0.5 + avgM * 0.3 + diversityBonus), 100);
  },

  async computeBehaviorScore(businessId: string): Promise<number> {
    const { data } = await db('behavior_metrics').select('*').eq('business_id', businessId).single();
    if (!data) return 50;
    const m = data as { conversion_rate: number; bounce_rate: number; repeat_rate: number; abandonment_rate: number };

    let score = 50;
    score += Math.min(m.conversion_rate * 2, 20);
    score -= Math.min(m.bounce_rate * 0.3, 15);
    score += Math.min(m.repeat_rate * 1.5, 15);
    score -= Math.min(m.abandonment_rate * 0.5, 10);

    return Math.min(Math.max(Math.round(score), 0), 100);
  },

  async computeReviewScore(businessId: string): Promise<number> {
    const { data } = await db('reviews').select('rating, verified_transaction').eq('business_id', businessId);
    const reviews = data ?? [];
    if (reviews.length === 0) return 40;

    const avgRating = reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / reviews.length;
    const verifiedRatio = reviews.filter((r: { verified_transaction: boolean }) => r.verified_transaction).length / reviews.length;
    const volumeBonus = Math.min(reviews.length * 2, 20);

    return Math.min(Math.round(avgRating * 15 + verifiedRatio * 15 + volumeBonus), 100);
  },

  async computeReliabilityScore(businessId: string): Promise<number> {
    const { data } = await db('trust_signals').select('*').eq('business_id', businessId).single();
    if (!data) return 50;
    const s = data as { response_rate: number; completed_orders: number; cancellation_rate: number; avg_response_time: number };

    let score = 40;
    score += Math.min(s.response_rate * 0.3, 20);
    score += Math.min(s.completed_orders * 0.5, 20);
    score -= Math.min(s.cancellation_rate * 1.5, 20);
    if (s.avg_response_time < 300) score += 10;
    else if (s.avg_response_time < 900) score += 5;

    return Math.min(Math.max(Math.round(score), 0), 100);
  },

  async computeFraudRisk(businessId: string): Promise<number> {
    const { data } = await db('fraud_flags').select('severity').eq('business_id', businessId).eq('resolved', false);
    const flags = data ?? [];
    if (flags.length === 0) return 0;

    const severityWeights: Record<string, number> = { low: 5, medium: 15, high: 30, critical: 50 };
    let risk = 0;
    for (const f of flags) {
      risk += severityWeights[(f as { severity: string }).severity] ?? 5;
    }

    return Math.min(risk, 100);
  },

  resolveVisibility(globalScore: number): { level: VisibilityLevel; weight: number; restrictions: string[] } {
    if (globalScore >= 85) return { level: 'boosted', weight: 1.5, restrictions: [] };
    if (globalScore >= 70) return { level: 'normal', weight: 1.0, restrictions: [] };
    if (globalScore >= 50) return { level: 'limited', weight: 0.5, restrictions: ['reduced exposure'] };
    if (globalScore >= 30) return { level: 'degraded', weight: 0.2, restrictions: ['hidden from search', 'no promotion'] };
    return { level: 'blocked', weight: 0, restrictions: ['listing hidden completely'] };
  },

  async updateVisibility(businessId: string, globalScore: number): Promise<VisibilityState> {
    const vis = this.resolveVisibility(globalScore);
    const state: VisibilityState = {
      business_id: businessId,
      visibility_level: vis.level,
      ranking_weight: vis.weight,
      restrictions: vis.restrictions,
      last_updated_at: new Date().toISOString(),
    };
    await db('visibility_state').upsert(state);
    return state;
  },

  async get(businessId: string): Promise<TrustScore | null> {
    const { data } = await db('trust_score').select('*').eq('business_id', businessId).single();
    return data as TrustScore | null;
  },

  async getVisibility(businessId: string): Promise<VisibilityState | null> {
    const { data } = await db('visibility_state').select('*').eq('business_id', businessId).single();
    return data as VisibilityState | null;
  },
};
