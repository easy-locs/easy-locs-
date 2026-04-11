export interface TrustScore {
  business_id: string;
  global_score: number;
  data_score: number;
  media_score: number;
  behavior_score: number;
  review_score: number;
  reliability_score: number;
  fraud_risk_score: number;
  last_updated_at: string;
}

export type VisibilityLevel = 'boosted' | 'normal' | 'limited' | 'degraded' | 'blocked';

export interface VisibilityState {
  business_id: string;
  visibility_level: VisibilityLevel;
  ranking_weight: number;
  restrictions: string[];
  last_updated_at: string;
}

export interface RankScore {
  business_id: string;
  trust_component: number;
  proximity_component: number;
  popularity_component: number;
  availability_component: number;
  response_speed_component: number;
  freshness_component: number;
  final_score: number;
}

export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FraudType =
  | 'image_mismatch'
  | 'image_stock'
  | 'image_duplicate'
  | 'data_anomaly'
  | 'price_inconsistency'
  | 'behavior_anomaly'
  | 'review_fraud'
  | 'duplicate_business'
  | 'fake_fields'
  | 'spam';

export interface FraudFlag {
  flag_id: string;
  business_id: string;
  type: FraudType;
  severity: FraudSeverity;
  detected_at: string;
  auto_action: string;
  resolved: boolean;
  details: string;
}

export interface UserSignal {
  signal_id: string;
  business_id: string;
  type: 'review' | 'report' | 'complaint' | 'refund' | 'rating_drop';
  weight: number;
  created_at: string;
}

export interface BehaviorMetrics {
  business_id: string;
  conversion_rate: number;
  bounce_rate: number;
  abandonment_rate: number;
  repeat_rate: number;
  click_count: number;
  order_count: number;
  updated_at: string;
}

export interface ProofLog {
  log_id: string;
  business_id: string;
  event_type: string;
  before_state: string;
  after_state: string;
  triggered_by: 'system' | 'user' | 'admin';
  reason: string;
  timestamp: string;
}
