export type ControlDomain =
  | "auth"
  | "identity"
  | "orbit"
  | "orbit_call"
  | "wallet"
  | "payment"
  | "dashboard"
  | "radar"
  | "marketplace"
  | "listing"
  | "scraping"
  | "media"
  | "notification"
  | "booking"
  | "food"
  | "hotel"
  | "services"
  | "flights"
  | "property"
  | "rider"
  | "support"
  | "admin"
  | "realtime"
  | "cron"
  | "taxonomy";

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export type IncidentPriority = "P0" | "P1" | "P2" | "P3";

export type IncidentStatus = "active" | "investigating" | "mitigating" | "resolved";

export interface DomainHealthSnapshot {
  domain: ControlDomain;
  status: HealthStatus;
  error_rate: number;
  success_rate: number;
  latency_p95_ms: number;
  active_incidents: number;
  degraded_since?: string;
  top_failing_actions: string[];
  last_checked: string;
  rollback_ready: boolean;
}

export interface Incident {
  id: string;
  domain: ControlDomain;
  priority: IncidentPriority;
  status: IncidentStatus;
  title: string;
  description: string;
  detected_at: string;
  resolved_at?: string;
  affected_users_estimate?: number;
  error_code?: string;
  release_id?: string;
  auto_mitigated: boolean;
}

export interface KillSwitch {
  id: string;
  domain: ControlDomain;
  feature: string;
  enabled: boolean;
  reason?: string;
  toggled_at: string;
  toggled_by: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  domain: ControlDomain;
  enabled: boolean;
  rollout_percentage: number;
  environments: string[];
}

export interface ReleaseRecord {
  release_id: string;
  deployed_at: string;
  status: "healthy" | "degraded" | "rolled_back";
  domains_touched: ControlDomain[];
  error_count_post_deploy: number;
  rollback_available: boolean;
}

export interface PlatformHealthSummary {
  overall_status: HealthStatus;
  domains: DomainHealthSnapshot[];
  active_incidents: Incident[];
  kill_switches: KillSwitch[];
  current_release?: ReleaseRecord;
  checked_at: string;
}
