import { db } from '@/services/db';
import type { RankScore, TrustScore } from './trust-types';

const RANK_WEIGHTS = {
  trust: 0.35,
  proximity: 0.20,
  popularity: 0.15,
  availability: 0.10,
  response_speed: 0.10,
  freshness: 0.10,
};

export const rankingEngine = {
  async computeRank(
    businessId: string,
    userLat?: number,
    userLng?: number
  ): Promise<RankScore> {
    const [trustComp, proxComp, popComp, availComp, speedComp, freshComp] = await Promise.all([
      this.getTrustComponent(businessId),
      this.getProximityComponent(businessId, userLat, userLng),
      this.getPopularityComponent(businessId),
      this.getAvailabilityComponent(businessId),
      this.getResponseSpeedComponent(businessId),
      this.getFreshnessComponent(businessId),
    ]);

    const final = Math.round(
      RANK_WEIGHTS.trust * trustComp +
      RANK_WEIGHTS.proximity * proxComp +
      RANK_WEIGHTS.popularity * popComp +
      RANK_WEIGHTS.availability * availComp +
      RANK_WEIGHTS.response_speed * speedComp +
      RANK_WEIGHTS.freshness * freshComp
    );

    return {
      business_id: businessId,
      trust_component: trustComp,
      proximity_component: proxComp,
      popularity_component: popComp,
      availability_component: availComp,
      response_speed_component: speedComp,
      freshness_component: freshComp,
      final_score: Math.min(Math.max(final, 0), 100),
    };
  },

  async getTrustComponent(businessId: string): Promise<number> {
    const { data } = await db('trust_score').select('global_score').eq('business_id', businessId).single();
    return (data as { global_score: number } | null)?.global_score ?? 50;
  },

  async getProximityComponent(businessId: string, userLat?: number, userLng?: number): Promise<number> {
    if (userLat == null || userLng == null) return 50;
    const { data } = await db('business_core').select('lat, lng').eq('business_id', businessId).single();
    if (!data) return 50;
    const b = data as { lat: number | null; lng: number | null };
    if (b.lat == null || b.lng == null) return 30;

    const dist = haversineKm(userLat, userLng, b.lat, b.lng);
    if (dist < 1) return 100;
    if (dist < 5) return 80;
    if (dist < 15) return 60;
    if (dist < 50) return 40;
    return 20;
  },

  async getPopularityComponent(businessId: string): Promise<number> {
    const { data } = await db('behavior_metrics').select('click_count, order_count').eq('business_id', businessId).single();
    if (!data) return 30;
    const m = data as { click_count: number; order_count: number };
    return Math.min(30 + m.order_count * 2 + m.click_count * 0.1, 100);
  },

  async getAvailabilityComponent(businessId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await db('availability_calendar')
      .select('status')
      .eq('business_id', businessId)
      .eq('date', today);

    if (!data || data.length === 0) return 50;
    const openSlots = (data as { status: string }[]).filter(s => s.status === 'open').length;
    return Math.min(Math.round((openSlots / data.length) * 100), 100);
  },

  async getResponseSpeedComponent(businessId: string): Promise<number> {
    const { data } = await db('trust_signals').select('avg_response_time').eq('business_id', businessId).single();
    if (!data) return 50;
    const t = (data as { avg_response_time: number }).avg_response_time;
    if (t < 60) return 100;
    if (t < 300) return 80;
    if (t < 900) return 60;
    if (t < 3600) return 40;
    return 20;
  },

  async getFreshnessComponent(businessId: string): Promise<number> {
    const { data } = await db('business_core').select('last_activity_at').eq('business_id', businessId).single();
    if (!data) return 30;
    const last = new Date((data as { last_activity_at: string }).last_activity_at).getTime();
    const ageHours = (Date.now() - last) / 3600000;
    if (ageHours < 1) return 100;
    if (ageHours < 24) return 80;
    if (ageHours < 168) return 60;
    if (ageHours < 720) return 40;
    return 20;
  },

  async rankMultiple(businessIds: string[], userLat?: number, userLng?: number): Promise<RankScore[]> {
    const scores = await Promise.all(businessIds.map(id => this.computeRank(id, userLat, userLng)));
    return scores.sort((a, b) => b.final_score - a.final_score);
  },
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
