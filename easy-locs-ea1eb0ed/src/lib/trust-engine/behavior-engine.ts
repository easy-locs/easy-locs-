import { db } from '@/services/db';
import type { BehaviorMetrics, UserSignal } from './trust-types';

export const behaviorEngine = {
  async trackEvent(businessId: string, event: 'click' | 'conversion' | 'bounce' | 'repeat' | 'abandonment' | 'cancellation'): Promise<void> {
    const existing = await this.getMetrics(businessId);
    const metrics: BehaviorMetrics = existing ?? {
      business_id: businessId,
      conversion_rate: 0,
      bounce_rate: 0,
      abandonment_rate: 0,
      repeat_rate: 0,
      click_count: 0,
      order_count: 0,
      updated_at: new Date().toISOString(),
    };

    switch (event) {
      case 'click':
        metrics.click_count += 1;
        break;
      case 'conversion':
        metrics.order_count += 1;
        metrics.conversion_rate = metrics.click_count > 0 ? (metrics.order_count / metrics.click_count) * 100 : 0;
        break;
      case 'bounce':
        metrics.bounce_rate = Math.min(metrics.bounce_rate + 0.5, 100);
        break;
      case 'repeat':
        metrics.repeat_rate = Math.min(metrics.repeat_rate + 1, 100);
        break;
      case 'abandonment':
        metrics.abandonment_rate = Math.min(metrics.abandonment_rate + 0.5, 100);
        break;
      case 'cancellation':
        metrics.conversion_rate = Math.max(metrics.conversion_rate - 0.5, 0);
        break;
    }

    metrics.updated_at = new Date().toISOString();
    await db('behavior_metrics').upsert(metrics);
  },

  async getMetrics(businessId: string): Promise<BehaviorMetrics | null> {
    const { data } = await db('behavior_metrics').select('*').eq('business_id', businessId).single();
    return data as BehaviorMetrics | null;
  },

  async addUserSignal(signal: Omit<UserSignal, 'signal_id' | 'created_at'>): Promise<void> {
    await db('user_signals').insert({
      ...signal,
      created_at: new Date().toISOString(),
    });
  },

  async getUserSignals(businessId: string, limit = 50): Promise<UserSignal[]> {
    const { data } = await db('user_signals')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as UserSignal[];
  },

  async computeSignalImpact(businessId: string): Promise<{ trustDelta: number; fraudDelta: number }> {
    const signals = await this.getUserSignals(businessId, 100);
    let trustDelta = 0;
    let fraudDelta = 0;

    for (const s of signals) {
      switch (s.type) {
        case 'report':
          trustDelta -= s.weight * 2;
          fraudDelta += s.weight;
          break;
        case 'complaint':
          trustDelta -= s.weight * 1.5;
          break;
        case 'refund':
          trustDelta -= s.weight;
          fraudDelta += s.weight * 0.5;
          break;
        case 'review':
          trustDelta += s.weight * 0.5;
          break;
        case 'rating_drop':
          trustDelta -= s.weight * 3;
          break;
      }
    }

    return { trustDelta, fraudDelta };
  },
};
