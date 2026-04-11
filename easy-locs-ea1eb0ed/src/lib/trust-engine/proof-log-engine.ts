import { db } from '@/services/db';
import type { ProofLog } from './trust-types';

export const proofLogEngine = {
  async log(entry: Omit<ProofLog, 'log_id' | 'timestamp'>): Promise<void> {
    await db('proof_log').insert({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  },

  async getForBusiness(businessId: string, limit = 50): Promise<ProofLog[]> {
    const { data } = await db('proof_log')
      .select('*')
      .eq('business_id', businessId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    return (data ?? []) as ProofLog[];
  },

  async getByEventType(eventType: string, limit = 100): Promise<ProofLog[]> {
    const { data } = await db('proof_log')
      .select('*')
      .eq('event_type', eventType)
      .order('timestamp', { ascending: false })
      .limit(limit);
    return (data ?? []) as ProofLog[];
  },

  async logTrustChange(businessId: string, before: number, after: number, reason: string, triggeredBy: 'system' | 'user' | 'admin'): Promise<void> {
    await this.log({
      business_id: businessId,
      event_type: 'trust_score_change',
      before_state: JSON.stringify({ score: before }),
      after_state: JSON.stringify({ score: after }),
      triggered_by: triggeredBy,
      reason,
    });
  },

  async logVisibilityChange(businessId: string, before: string, after: string, reason: string): Promise<void> {
    await this.log({
      business_id: businessId,
      event_type: 'visibility_change',
      before_state: before,
      after_state: after,
      triggered_by: 'system',
      reason,
    });
  },

  async logFraudAction(businessId: string, action: string, details: string): Promise<void> {
    await this.log({
      business_id: businessId,
      event_type: 'fraud_action',
      before_state: '',
      after_state: action,
      triggered_by: 'system',
      reason: details,
    });
  },

  async logOnboardingStep(businessId: string, stepName: string, status: string): Promise<void> {
    await this.log({
      business_id: businessId,
      event_type: 'onboarding_step',
      before_state: '',
      after_state: status,
      triggered_by: 'user',
      reason: `Step "${stepName}" → ${status}`,
    });
  },

  async getRecentActivity(minutes = 5): Promise<ProofLog[]> {
    const since = new Date(Date.now() - minutes * 60000).toISOString();
    const { data } = await db('proof_log')
      .select('*')
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(100);
    return (data ?? []) as ProofLog[];
  },
};
