import { platformBus } from "@/lib/shared/platform-bus";
import { structuredLogger } from "@/lib/observability/structured-logger";
import { toggleKillSwitch } from "./kill-switches";
import type { ControlDomain, KillSwitch, FeatureFlag } from "./types";

export type DegradationMode =
  | "normal"
  | "read_only"
  | "write_freeze"
  | "partial_disable"
  | "attachment_disable"
  | "background_pause"
  | "queue_pause"
  | "admin_only"
  | "quarantine";

export interface ServerKillSwitch extends KillSwitch {
  audit_trail: KillSwitchAuditEntry[];
}

export interface KillSwitchAuditEntry {
  actor: string;
  reason: string | null;
  before_state: boolean;
  after_state: boolean;
  timestamp: string;
}

export interface ServerFeatureFlag extends FeatureFlag {
  updated_by: string;
  updated_at: string;
}

export interface DomainDegradation {
  domain: ControlDomain;
  mode: DegradationMode;
  reason: string | null;
  activated_by: string;
  activated_at: string;
  auto_restore_at: string | null;
}

const serverKillSwitches = new Map<string, ServerKillSwitch>();
const serverFeatureFlags = new Map<string, ServerFeatureFlag>();
const domainDegradations = new Map<string, DomainDegradation>();

let syncedFromServer = false;

export async function syncFromServer(supabaseClient: any): Promise<void> {
  try {
    const [ksResult, ffResult, degResult] = await Promise.all([
      supabaseClient.from("kill_switches_server").select("*"),
      supabaseClient.from("feature_flags_server").select("*"),
      supabaseClient.from("domain_degradation_modes").select("*"),
    ]);

    if (ksResult.data) {
      serverKillSwitches.clear();
      for (const ks of ksResult.data) {
        serverKillSwitches.set(ks.feature, {
          id: ks.id,
          domain: ks.domain as ControlDomain,
          feature: ks.feature,
          enabled: ks.enabled,
          reason: ks.reason,
          toggled_at: ks.toggled_at,
          toggled_by: ks.toggled_by,
          audit_trail: [],
        });
      }
    }

    if (ffResult.data) {
      serverFeatureFlags.clear();
      for (const ff of ffResult.data) {
        serverFeatureFlags.set(ff.name, {
          id: ff.id,
          name: ff.name,
          domain: ff.domain as ControlDomain,
          enabled: ff.enabled,
          rollout_percentage: ff.rollout_percentage,
          environments: ff.environments ?? [],
          updated_by: ff.updated_by,
          updated_at: ff.updated_at,
        });
      }
    }

    if (degResult.data) {
      domainDegradations.clear();
      for (const d of degResult.data) {
        domainDegradations.set(d.domain, {
          domain: d.domain as ControlDomain,
          mode: d.mode as DegradationMode,
          reason: d.reason,
          activated_by: d.activated_by,
          activated_at: d.activated_at,
          auto_restore_at: d.auto_restore_at,
        });
      }
    }

    if (ksResult.data) {
      for (const ks of ksResult.data) {
        toggleKillSwitch(ks.feature, ks.enabled, ks.reason ?? "server-sync", ks.toggled_by ?? "server");
      }
    }

    syncedFromServer = true;
    structuredLogger.info("system", "control_plane.synced", `Synced ${ksResult.data?.length ?? 0} kill switches, ${ffResult.data?.length ?? 0} flags, ${degResult.data?.length ?? 0} degradation modes`);
  } catch (err: unknown) {
    structuredLogger.error("system", "control_plane.sync_failed", err instanceof Error ? err.message : String(err));
  }
}

export async function toggleKillSwitchServer(
  supabaseClient: any,
  feature: string,
  enabled: boolean,
  actor: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabaseClient.rpc("toggle_kill_switch_server", {
      p_feature: feature,
      p_enabled: enabled,
      p_actor: actor,
      p_reason: reason,
    });

    if (error) return { ok: false, error: error.message };

    const local = serverKillSwitches.get(feature);
    if (local) {
      local.audit_trail.push({
        actor,
        reason,
        before_state: local.enabled,
        after_state: enabled,
        timestamp: new Date().toISOString(),
      });
      local.enabled = enabled;
      local.reason = reason;
      local.toggled_by = actor;
      local.toggled_at = new Date().toISOString();
    }

    platformBus.emit("control_plane:kill_switch_toggled", {
      feature,
      enabled,
      actor,
      reason,
    }, "system");

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

export async function setDomainDegradationServer(
  supabaseClient: any,
  domain: ControlDomain,
  mode: DegradationMode,
  actor: string,
  reason: string,
  autoRestoreMinutes?: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabaseClient.rpc("set_domain_degradation", {
      p_domain: domain,
      p_mode: mode,
      p_actor: actor,
      p_reason: reason,
      p_auto_restore_minutes: autoRestoreMinutes ?? null,
    });

    if (error) return { ok: false, error: error.message };

    domainDegradations.set(domain, {
      domain,
      mode,
      reason,
      activated_by: actor,
      activated_at: new Date().toISOString(),
      auto_restore_at: autoRestoreMinutes
        ? new Date(Date.now() + autoRestoreMinutes * 60000).toISOString()
        : null,
    });

    platformBus.emit("control_plane:degradation_changed", {
      domain,
      mode,
      actor,
      reason,
    }, "system");

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

export async function emergencyShutdownServer(
  supabaseClient: any,
  domain: ControlDomain,
  reason: string,
  actor = "auto-protect",
): Promise<{ ok: boolean; affected: string[] }> {
  const affected: string[] = [];

  for (const [feature, ks] of serverKillSwitches) {
    if (ks.domain === domain && ks.enabled) {
      await toggleKillSwitchServer(supabaseClient, feature, false, actor, `EMERGENCY: ${reason}`);
      affected.push(feature);
    }
  }

  await setDomainDegradationServer(supabaseClient, domain, "quarantine", actor, `EMERGENCY: ${reason}`, 30);

  structuredLogger.critical(
    domain,
    "emergency_shutdown_server",
    `Emergency shutdown for ${domain}: ${affected.length} features disabled, domain quarantined`,
    { payload_summary: { affected, reason } },
  );

  return { ok: true, affected };
}

export function isFeatureEnabledServer(feature: string): boolean {
  const ks = serverKillSwitches.get(feature);
  return ks ? ks.enabled : true;
}

export function getDomainMode(domain: ControlDomain): DegradationMode {
  return domainDegradations.get(domain)?.mode ?? "normal";
}

export function isDomainWritable(domain: ControlDomain): boolean {
  const mode = getDomainMode(domain);
  return mode === "normal" || mode === "partial_disable";
}

export function isDomainReadable(domain: ControlDomain): boolean {
  const mode = getDomainMode(domain);
  return mode !== "quarantine";
}

export function getAllServerKillSwitches(): ServerKillSwitch[] {
  return Array.from(serverKillSwitches.values());
}

export function getAllServerFeatureFlags(): ServerFeatureFlag[] {
  return Array.from(serverFeatureFlags.values());
}

export function getAllDomainDegradations(): DomainDegradation[] {
  return Array.from(domainDegradations.values());
}

export function isSyncedFromServer(): boolean {
  return syncedFromServer;
}

export function subscribeToServerUpdates(supabaseClient: any): () => void {
  const channel = supabaseClient
    .channel("control-plane-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "kill_switches_server" }, (payload: any) => {
      if (payload.new) {
        const ks = payload.new;
        serverKillSwitches.set(ks.feature, {
          id: ks.id,
          domain: ks.domain as ControlDomain,
          feature: ks.feature,
          enabled: ks.enabled,
          reason: ks.reason,
          toggled_at: ks.toggled_at,
          toggled_by: ks.toggled_by,
          audit_trail: serverKillSwitches.get(ks.feature)?.audit_trail ?? [],
        });
        platformBus.emit("control_plane:kill_switch_synced", { feature: ks.feature, enabled: ks.enabled }, "system");
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "domain_degradation_modes" }, (payload: any) => {
      if (payload.new) {
        const d = payload.new;
        domainDegradations.set(d.domain, {
          domain: d.domain as ControlDomain,
          mode: d.mode as DegradationMode,
          reason: d.reason,
          activated_by: d.activated_by,
          activated_at: d.activated_at,
          auto_restore_at: d.auto_restore_at,
        });
        platformBus.emit("control_plane:degradation_synced", { domain: d.domain, mode: d.mode }, "system");
      }
    })
    .subscribe();

  return () => {
    supabaseClient.removeChannel(channel);
  };
}
