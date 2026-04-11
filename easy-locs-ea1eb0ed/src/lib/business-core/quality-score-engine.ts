import { db } from '@/services/db';
import type { BusinessCore, BusinessQualityScore } from './business-types';

export interface QualityEvaluation {
  completeness_score: number;
  media_score: number;
  consistency_score: number;
  trust_score: number;
  overall_score: number;
  issues: string[];
  suggestions: string[];
}

const COMPLETENESS_FIELDS: (keyof BusinessCore)[] = [
  'name', 'description_short', 'description_long', 'phone', 'email',
  'address_line1', 'city', 'country', 'lat', 'lng', 'canonical_path',
  'logo_media_id', 'cover_media_id', 'timezone', 'currency',
];

export const qualityScoreEngine = {
  async evaluate(business: BusinessCore): Promise<QualityEvaluation> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    const completeness = this.computeCompleteness(business, issues, suggestions);
    const media = await this.computeMediaScore(business.business_id, issues, suggestions);
    const consistency = this.computeConsistency(business, issues);
    const trust = await this.computeTrustComponent(business.business_id, issues, suggestions);

    const overall = Math.round(
      completeness * 0.30 +
      media * 0.25 +
      consistency * 0.20 +
      trust * 0.25
    );

    const score: BusinessQualityScore = {
      business_id: business.business_id,
      completeness_score: completeness,
      media_score: media,
      consistency_score: consistency,
      trust_score: trust,
      overall_score: overall,
      last_evaluated_at: new Date().toISOString(),
    };

    await db('business_quality_score').upsert(score);

    return { ...score, issues, suggestions };
  },

  computeCompleteness(business: BusinessCore, issues: string[], suggestions: string[]): number {
    let filled = 0;
    for (const field of COMPLETENESS_FIELDS) {
      const val = business[field];
      if (val !== null && val !== undefined && val !== '') filled++;
    }

    const score = Math.round((filled / COMPLETENESS_FIELDS.length) * 100);

    if (score < 60) issues.push('Profile is less than 60% complete');
    if (!business.description_long) suggestions.push('Add a detailed description to attract more customers');
    if (!business.tags?.length) suggestions.push('Add tags to improve discoverability');
    if (!business.languages?.length) suggestions.push('Specify languages spoken');

    return score;
  },

  async computeMediaScore(businessId: string, issues: string[], suggestions: string[]): Promise<number> {
    const { data } = await db('media_assets').select('quality_score, category_match_score, is_primary').eq('business_id', businessId);
    const assets = data ?? [];

    if (assets.length === 0) {
      issues.push('No media uploaded');
      return 0;
    }

    const avgQuality = assets.reduce((sum: number, a: { quality_score: number }) => sum + (a.quality_score ?? 0), 0) / assets.length;
    const avgMatch = assets.reduce((sum: number, a: { category_match_score: number }) => sum + (a.category_match_score ?? 0), 0) / assets.length;
    const hasPrimary = assets.some((a: { is_primary: boolean }) => a.is_primary);

    let score = Math.round((avgQuality * 0.5 + avgMatch * 0.3 + (hasPrimary ? 20 : 0)));

    if (assets.length < 3) {
      suggestions.push('Upload at least 3 photos for better engagement');
      score = Math.min(score, 70);
    }
    if (avgQuality < 50) issues.push('Some images have low quality scores');

    return Math.min(score, 100);
  },

  computeConsistency(business: BusinessCore, issues: string[]): number {
    let score = 100;

    if (business.is_temporarily_closed && business.status === 'active') {
      issues.push('Business marked as temporarily closed but status is active');
      score -= 15;
    }

    if (business.is_24_7 && business.opening_hours_json) {
      issues.push('Business marked as 24/7 but has specific hours set');
      score -= 10;
    }

    if (!business.canonical_path && business.status === 'active') {
      issues.push('Active business without category classification');
      score -= 25;
    }

    if (business.rating > 0 && business.review_count === 0) {
      issues.push('Rating exists without reviews');
      score -= 20;
    }

    return Math.max(score, 0);
  },

  async computeTrustComponent(businessId: string, issues: string[], suggestions: string[]): Promise<number> {
    const { data } = await db('trust_signals').select('*').eq('business_id', businessId).single();

    if (!data) {
      suggestions.push('Build trust by completing orders and responding to messages');
      return 30;
    }

    const signals = data as {
      verified_badge: boolean;
      response_rate: number;
      avg_response_time: number;
      completed_orders: number;
      cancellation_rate: number;
    };

    let score = 50;
    if (signals.verified_badge) score += 15;
    if (signals.response_rate > 80) score += 10;
    if (signals.response_rate > 95) score += 5;
    if (signals.completed_orders > 10) score += 10;
    if (signals.completed_orders > 50) score += 5;
    if (signals.cancellation_rate < 5) score += 5;

    if (signals.cancellation_rate > 20) {
      issues.push('High cancellation rate affects trust');
      score -= 15;
    }
    if (signals.avg_response_time > 3600) {
      suggestions.push('Respond faster to improve trust score');
      score -= 10;
    }

    return Math.min(Math.max(score, 0), 100);
  },

  isPublishReady(score: QualityEvaluation): boolean {
    return score.overall_score >= 40 && score.completeness_score >= 50;
  },

  getVisibilityTier(overallScore: number): 'boosted' | 'normal' | 'limited' | 'degraded' | 'hidden' {
    if (overallScore >= 85) return 'boosted';
    if (overallScore >= 70) return 'normal';
    if (overallScore >= 50) return 'limited';
    if (overallScore >= 30) return 'degraded';
    return 'hidden';
  },
};
