import { db } from '@/services/db';
import type {
  BusinessCore,
  BusinessType,
  BusinessStatus,
  MediaAsset,
  AvailabilityCalendar,
  OnboardingStep,
  BusinessQualityScore,
  Review,
  TrustSignals,
  PricingRule,
  BusinessPolicy,
  ONBOARDING_STEPS,
  OnboardingStepName,
} from './business-types';

const TABLE = 'business_core';

export const businessService = {
  async getById(businessId: string): Promise<BusinessCore | null> {
    const { data } = await db(TABLE).select('*').eq('business_id', businessId).single();
    return data as BusinessCore | null;
  },

  async getByOwner(userId: string): Promise<BusinessCore[]> {
    const { data } = await db(TABLE).select('*').eq('owner_user_id', userId).order('created_at', { ascending: false });
    return (data ?? []) as BusinessCore[];
  },

  async getByOrganization(orgId: string): Promise<BusinessCore[]> {
    const { data } = await db(TABLE).select('*').eq('organization_id', orgId).order('name');
    return (data ?? []) as BusinessCore[];
  },

  async create(input: Partial<BusinessCore> & { name: string; business_type: BusinessType; owner_user_id: string }): Promise<BusinessCore | null> {
    const now = new Date().toISOString();
    const record = {
      ...input,
      status: 'draft' as BusinessStatus,
      verification_status: 'pending' as const,
      onboarding_progress: 0,
      rating: 0,
      review_count: 0,
      tags: input.tags ?? [],
      languages: input.languages ?? [],
      gallery_ids: input.gallery_ids ?? [],
      service_modes: input.service_modes ?? [],
      is_24_7: input.is_24_7 ?? false,
      is_temporarily_closed: false,
      currency: input.currency ?? 'USD',
      timezone: input.timezone ?? 'UTC',
      created_at: now,
      updated_at: now,
      last_activity_at: now,
    };
    const { data } = await db(TABLE).insert(record).select().single();
    return data as BusinessCore | null;
  },

  async update(businessId: string, updates: Partial<BusinessCore>): Promise<BusinessCore | null> {
    const { data } = await db(TABLE)
      .update({ ...updates, updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
      .eq('business_id', businessId)
      .select()
      .single();
    return data as BusinessCore | null;
  },

  async updateStatus(businessId: string, status: BusinessStatus): Promise<void> {
    await db(TABLE).update({ status, updated_at: new Date().toISOString() }).eq('business_id', businessId);
  },

  async search(filters: {
    business_type?: BusinessType;
    city?: string;
    country?: string;
    status?: BusinessStatus;
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<BusinessCore[]> {
    let q = db(TABLE).select('*');
    if (filters.business_type) q = q.eq('business_type', filters.business_type);
    if (filters.city) q = q.ilike('city', `%${filters.city}%`);
    if (filters.country) q = q.eq('country', filters.country);
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.query) q = q.or(`name.ilike.%${filters.query}%,description_short.ilike.%${filters.query}%`);
    q = q.range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 20) - 1);
    q = q.order('rating', { ascending: false });
    const { data } = await q;
    return (data ?? []) as BusinessCore[];
  },

  async delete(businessId: string): Promise<void> {
    await db(TABLE).delete().eq('business_id', businessId);
  },

  async getActiveCount(): Promise<number> {
    const { count } = await db(TABLE).select('*', { count: 'exact', head: true }).eq('status', 'active');
    return count ?? 0;
  },
};

export const mediaService = {
  async getForEntity(entityType: string, entityId: string): Promise<MediaAsset[]> {
    const { data } = await db('media_assets').select('*').eq('entity_type', entityType).eq('entity_id', entityId).order('is_primary', { ascending: false });
    return (data ?? []) as MediaAsset[];
  },

  async getForBusiness(businessId: string): Promise<MediaAsset[]> {
    const { data } = await db('media_assets').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    return (data ?? []) as MediaAsset[];
  },

  async upload(asset: Omit<MediaAsset, 'media_id' | 'created_at'>): Promise<MediaAsset | null> {
    const { data } = await db('media_assets').insert({ ...asset, created_at: new Date().toISOString() }).select().single();
    return data as MediaAsset | null;
  },

  async setPrimary(mediaId: string, entityType: string, entityId: string): Promise<void> {
    await db('media_assets').update({ is_primary: false }).eq('entity_type', entityType).eq('entity_id', entityId);
    await db('media_assets').update({ is_primary: true }).eq('media_id', mediaId);
  },

  async delete(mediaId: string): Promise<void> {
    await db('media_assets').delete().eq('media_id', mediaId);
  },
};

export const availabilityService = {
  async getForEntity(entityType: string, entityId: string, startDate: string, endDate: string): Promise<AvailabilityCalendar[]> {
    const { data } = await db('availability_calendar')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');
    return (data ?? []) as AvailabilityCalendar[];
  },

  async upsert(entry: Omit<AvailabilityCalendar, 'calendar_id'>): Promise<void> {
    await db('availability_calendar').upsert(entry, { onConflict: 'entity_type,entity_id,date' });
  },

  async bulkUpdate(entries: Omit<AvailabilityCalendar, 'calendar_id'>[]): Promise<void> {
    await db('availability_calendar').upsert(entries, { onConflict: 'entity_type,entity_id,date' });
  },

  async setBlackout(businessId: string, entityType: string, entityId: string, dates: string[]): Promise<void> {
    const entries = dates.map(date => ({
      business_id: businessId,
      entity_type: entityType,
      entity_id: entityId,
      date,
      capacity: 0,
      available_units: 0,
      status: 'blocked' as const,
    }));
    await db('availability_calendar').upsert(entries, { onConflict: 'entity_type,entity_id,date' });
  },
};

export const reviewService = {
  async getForBusiness(businessId: string, limit = 20, offset = 0): Promise<Review[]> {
    const { data } = await db('reviews')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return (data ?? []) as Review[];
  },

  async getAverage(businessId: string): Promise<{ avg: number; count: number }> {
    const { data } = await db('reviews').select('rating').eq('business_id', businessId);
    const ratings = (data ?? []).map((r: { rating: number }) => r.rating);
    return {
      avg: ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0,
      count: ratings.length,
    };
  },

  async create(review: Omit<Review, 'review_id' | 'created_at'>): Promise<Review | null> {
    const { data } = await db('reviews').insert({ ...review, created_at: new Date().toISOString() }).select().single();
    return data as Review | null;
  },
};

export const pricingService = {
  async getForBusiness(businessId: string): Promise<PricingRule[]> {
    const { data } = await db('pricing_rules').select('*').eq('business_id', businessId);
    return (data ?? []) as PricingRule[];
  },

  async upsert(rule: PricingRule): Promise<void> {
    await db('pricing_rules').upsert(rule);
  },
};

export const policyService = {
  async getForBusiness(businessId: string): Promise<BusinessPolicy[]> {
    const { data } = await db('policies').select('*').eq('business_id', businessId);
    return (data ?? []) as BusinessPolicy[];
  },

  async upsert(policy: BusinessPolicy): Promise<void> {
    await db('policies').upsert(policy);
  },
};

export const trustSignalService = {
  async get(businessId: string): Promise<TrustSignals | null> {
    const { data } = await db('trust_signals').select('*').eq('business_id', businessId).single();
    return data as TrustSignals | null;
  },

  async upsert(signals: TrustSignals): Promise<void> {
    await db('trust_signals').upsert(signals);
  },
};

export const qualityScoreService = {
  async get(businessId: string): Promise<BusinessQualityScore | null> {
    const { data } = await db('business_quality_score').select('*').eq('business_id', businessId).single();
    return data as BusinessQualityScore | null;
  },

  async upsert(score: BusinessQualityScore): Promise<void> {
    await db('business_quality_score').upsert(score);
  },
};
