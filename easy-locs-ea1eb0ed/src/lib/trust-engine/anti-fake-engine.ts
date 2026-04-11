import { db } from '@/services/db';
import type { FraudFlag, FraudType, FraudSeverity } from './trust-types';

export interface FraudScanResult {
  businessId: string;
  flags: FraudFlag[];
  totalRisk: number;
  autoActions: string[];
}

export const antiFakeEngine = {
  async scanBusiness(businessId: string): Promise<FraudScanResult> {
    const flags: FraudFlag[] = [];
    const autoActions: string[] = [];

    const [imageFlags, dataFlags, behaviorFlags, reviewFlags, dupeFlags] = await Promise.all([
      this.checkImageFraud(businessId),
      this.checkDataAnomaly(businessId),
      this.checkBehaviorAnomaly(businessId),
      this.checkReviewFraud(businessId),
      this.checkDuplicateBusiness(businessId),
    ]);

    flags.push(...imageFlags, ...dataFlags, ...behaviorFlags, ...reviewFlags, ...dupeFlags);

    for (const flag of flags) {
      const action = this.resolveAutoAction(flag.severity);
      flag.auto_action = action;
      autoActions.push(action);
      await db('fraud_flags').upsert(flag, { onConflict: 'business_id,type' });
    }

    const totalRisk = flags.reduce((sum, f) => {
      const weights: Record<FraudSeverity, number> = { low: 5, medium: 15, high: 30, critical: 50 };
      return sum + weights[f.severity];
    }, 0);

    return { businessId, flags, totalRisk: Math.min(totalRisk, 100), autoActions };
  },

  async checkImageFraud(businessId: string): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const { data } = await db('media_assets').select('media_id, url, quality_score, category_match_score').eq('business_id', businessId);
    const assets = data ?? [];

    for (const asset of assets) {
      const a = asset as { media_id: string; url: string | null; quality_score: number; category_match_score: number };
      if (a.category_match_score < 20) {
        flags.push(this.createFlag(businessId, 'image_mismatch', 'medium', `Media ${a.media_id} has low category match (${a.category_match_score})`));
      }
      if (a.quality_score < 10) {
        flags.push(this.createFlag(businessId, 'image_stock', 'low', `Media ${a.media_id} has suspiciously low quality`));
      }
    }

    const urls = assets.map((a: { url?: string | null }) => a.url).filter((u): u is string => !!u);
    const uniqueUrls = new Set(urls);
    if (urls.length > 0 && uniqueUrls.size < urls.length * 0.5) {
      flags.push(this.createFlag(businessId, 'image_duplicate', 'medium', 'Multiple duplicate images detected'));
    }

    return flags;
  },

  async checkDataAnomaly(businessId: string): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const { data } = await db('business_core').select('*').eq('business_id', businessId).single();
    if (!data) return flags;

    const b = data as { name: string; description_short: string | null; phone: string | null; email: string | null };

    if (b.name && /^[a-z0-9]{20,}$/i.test(b.name)) {
      flags.push(this.createFlag(businessId, 'fake_fields', 'medium', 'Business name appears auto-generated'));
    }

    if (b.description_short && b.description_short.length < 5) {
      flags.push(this.createFlag(businessId, 'data_anomaly', 'low', 'Description is suspiciously short'));
    }

    return flags;
  },

  async checkBehaviorAnomaly(businessId: string): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const { data } = await db('behavior_metrics').select('*').eq('business_id', businessId).single();
    if (!data) return flags;

    const m = data as { conversion_rate: number; click_count: number; order_count: number };

    if (m.click_count > 1000 && m.conversion_rate < 0.1) {
      flags.push(this.createFlag(businessId, 'behavior_anomaly', 'medium', 'High clicks with near-zero conversion suggests artificial traffic'));
    }

    return flags;
  },

  async checkReviewFraud(businessId: string): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const { data } = await db('reviews').select('created_at, rating, user_id, comment').eq('business_id', businessId).order('created_at', { ascending: false }).limit(50);
    const reviews = (data ?? []) as { created_at: string; rating: number; user_id: string; comment: string | null }[];

    if (reviews.length < 5) return flags;

    const recentBurst = reviews.filter(r => {
      const age = Date.now() - new Date(r.created_at).getTime();
      return age < 3600000;
    });
    if (recentBurst.length > 10) {
      flags.push(this.createFlag(businessId, 'review_fraud', 'high', `${recentBurst.length} reviews in last hour — possible review bombing`));
    }

    const userIds = reviews.map(r => r.user_id);
    const uniqueUsers = new Set(userIds);
    if (uniqueUsers.size < reviews.length * 0.5) {
      flags.push(this.createFlag(businessId, 'review_fraud', 'high', 'Many reviews from same users — possible fake reviews'));
    }

    const allSameRating = reviews.every(r => r.rating === reviews[0].rating);
    if (reviews.length > 10 && allSameRating) {
      flags.push(this.createFlag(businessId, 'review_fraud', 'medium', 'All reviews have identical rating — suspicious pattern'));
    }

    return flags;
  },

  async checkDuplicateBusiness(businessId: string): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const { data: biz } = await db('business_core').select('phone, address_line1, city, name').eq('business_id', businessId).single();
    if (!biz) return flags;

    const b = biz as { phone: string | null; address_line1: string; city: string; name: string };

    if (b.phone) {
      const { count } = await db('business_core').select('*', { count: 'exact', head: true }).eq('phone', b.phone).neq('business_id', businessId);
      if ((count ?? 0) > 0) {
        flags.push(this.createFlag(businessId, 'duplicate_business', 'high', 'Another business shares the same phone number'));
      }
    }

    if (b.address_line1 && b.city) {
      const { count } = await db('business_core')
        .select('*', { count: 'exact', head: true })
        .eq('address_line1', b.address_line1)
        .eq('city', b.city)
        .neq('business_id', businessId);
      if ((count ?? 0) > 0) {
        flags.push(this.createFlag(businessId, 'duplicate_business', 'medium', 'Another business at the same address'));
      }
    }

    return flags;
  },

  resolveAutoAction(severity: FraudSeverity): string {
    switch (severity) {
      case 'low': return 'warning';
      case 'medium': return 'visibility_downgrade';
      case 'high': return 'listing_limited_review_required';
      case 'critical': return 'immediate_block';
    }
  },

  createFlag(businessId: string, type: FraudType, severity: FraudSeverity, details: string): FraudFlag {
    return {
      flag_id: `${businessId}_${type}_${Date.now()}`,
      business_id: businessId,
      type,
      severity,
      detected_at: new Date().toISOString(),
      auto_action: '',
      resolved: false,
      details,
    };
  },

  async getActiveFlags(businessId: string): Promise<FraudFlag[]> {
    const { data } = await db('fraud_flags').select('*').eq('business_id', businessId).eq('resolved', false);
    return (data ?? []) as FraudFlag[];
  },

  async resolveFlag(flagId: string): Promise<void> {
    await db('fraud_flags').update({ resolved: true }).eq('flag_id', flagId);
  },
};
