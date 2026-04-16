import type { NormalizedDataPoint, SyncRecord } from "./types";
import { listConnectors, recordSync, replaceSyncHistory } from "./connector-registry";
import { platformBus } from "@/lib/shared/platform-bus";

interface DbConnectorState {
  connector_id: string;
  connector_name: string;
  domain: string;
  status: string;
  last_sync_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  last_record_count: number;
  last_duration_ms: number;
  updated_at: string;
}

interface DbSyncEvent {
  connector_id: string;
  domain: string;
  record_count: number;
  success: boolean;
  source_type: string;
  synced_at: string;
  total_bytes: number;
  duration_ms: number;
  error: string | null;
}

const DB_REFRESH_INTERVAL_MS = 15_000;

class OrchestrationEngine {
  private _initialized = false;
  private _refreshTimer: ReturnType<typeof setInterval> | null = null;
  private _lastSeenSyncAt: number = 0;

  get isInitialized(): boolean {
    return this._initialized;
  }

  initialize(): void {
    if (this._initialized) return;
    this._initialized = true;

    this.loadStateFromDb().catch(() => {});

    this._refreshTimer = setInterval(() => {
      this.loadStateFromDb().catch(() => {});
    }, DB_REFRESH_INTERVAL_MS);

    platformBus.emit(
      "system:gateway_initialized",
      { connectorCount: listConnectors().length },
      "system"
    );
  }

  shutdown(): void {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
    this._initialized = false;
    platformBus.emit("system:gateway_stopped", {}, "system");
  }

  async triggerServerSync(connectorId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("gateway-cron-sync", {
        body: connectorId ? { connectorId } : {},
      });

      if (error) {
        platformBus.emit(
          "system:gateway_sync_error",
          {
            connectorId: connectorId ?? "all",
            connectorName: connectorId ?? "All Connectors",
            error: error.message,
          },
          "system"
        );
        return { success: false, error: error.message };
      }

      await this.loadStateFromDb();

      const responseData = data as Record<string, unknown> | null;
      if (responseData) {
        const totalRecords = typeof responseData.totalRecords === "number" ? responseData.totalRecords : 0;
        const results = Array.isArray(responseData.results) ? responseData.results : [];

        for (const result of results) {
          const r = result as Record<string, unknown>;
          const rid = typeof r.id === "string" ? r.id : "";
          const rSuccess = r.success === true;
          const rRecords = typeof r.records === "number" ? r.records : 0;

          if (rSuccess && rRecords > 0) {
            const connector = listConnectors().find((c) => c.config.id === rid);
            const domain = connector?.config.domain ?? "custom";

            platformBus.emit(
              "system:gateway_data_received",
              {
                connectorId: rid,
                domain,
                recordCount: rRecords,
                timestamp: Date.now(),
              },
              "system"
            );

            const syncRecord: SyncRecord = {
              connectorId: rid,
              syncedAt: Date.now(),
              durationMs: 0,
              recordCount: rRecords,
              success: true,
              bytesReceived: 0,
            };
            recordSync(syncRecord);
          } else if (!rSuccess) {
            const rError = typeof r.error === "string" ? r.error : "Unknown error";
            platformBus.emit(
              "system:gateway_sync_error",
              {
                connectorId: rid,
                connectorName: rid,
                error: rError,
              },
              "system"
            );

            const syncRecord: SyncRecord = {
              connectorId: rid,
              syncedAt: Date.now(),
              durationMs: 0,
              recordCount: 0,
              success: false,
              error: rError,
              bytesReceived: 0,
            };
            recordSync(syncRecord);
          }
        }

        platformBus.emit(
          "system:gateway_server_sync_complete",
          {
            connectorId: connectorId ?? "all",
            totalRecords,
            timestamp: Date.now(),
          },
          "system"
        );
      }

      return { success: true };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      platformBus.emit(
        "system:gateway_sync_error",
        {
          connectorId: connectorId ?? "all",
          connectorName: connectorId ?? "All Connectors",
          error: errMsg,
        },
        "system"
      );
      return { success: false, error: errMsg };
    }
  }

  async refreshFromDb(): Promise<void> {
    await this.loadStateFromDb();
  }

  async getDbState(): Promise<DbConnectorState[]> {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("gateway_connector_state")
        .select("*")
        .order("connector_id");
      if (error || !data) return [];
      return data as DbConnectorState[];
    } catch {
      return [];
    }
  }

  async getDbSyncHistory(connectorId?: string, limit = 20): Promise<DbSyncEvent[]> {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      let query = supabase
        .from("gateway_sync_events")
        .select("*")
        .order("synced_at", { ascending: false })
        .limit(limit);
      if (connectorId) {
        query = query.eq("connector_id", connectorId);
      }
      const { data, error } = await query;
      if (error || !data) return [];
      return data as DbSyncEvent[];
    } catch {
      return [];
    }
  }

  private async isAdminSession(): Promise<boolean> {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      return profile?.role === "admin" || profile?.role === "super_admin";
    } catch {
      return false;
    }
  }

  private async loadStateFromDb(): Promise<void> {
    try {
      const isAdmin = await this.isAdminSession();
      if (!isAdmin) return;

      const states = await this.getDbState();
      const connectors = listConnectors();

      for (const state of states) {
        const connector = connectors.find((c) => c.config.id === state.connector_id);
        if (!connector) continue;

        connector.hydrateFromSnapshot({
          status: state.status,
          lastSyncAt: state.last_sync_at ? new Date(state.last_sync_at).getTime() : null,
          lastSuccessAt: state.last_success_at ? new Date(state.last_success_at).getTime() : null,
          lastError: state.last_error,
          lastRecordCount: state.last_record_count ?? 0,
          lastDurationMs: state.last_duration_ms ?? 0,
        });
      }

      const recentEvents = await this.getDbSyncHistory(undefined, 50);
      const grouped = new Map<string, SyncRecord[]>();
      for (const event of recentEvents) {
        const cid = event.connector_id;
        const existing = grouped.get(cid) ?? [];
        existing.push({
          connectorId: cid,
          syncedAt: new Date(event.synced_at).getTime(),
          durationMs: event.duration_ms ?? 0,
          recordCount: event.record_count,
          success: event.success,
          bytesReceived: event.total_bytes ?? 0,
          error: event.error ?? undefined,
        });
        grouped.set(cid, existing);
      }

      let maxSyncAt = this._lastSeenSyncAt;

      for (const [connectorId, records] of grouped) {
        replaceSyncHistory(connectorId, records);

        const connector = connectors.find((c) => c.config.id === connectorId);
        if (connector) {
          connector.hydrateMetricsFromHistory(records.map((r) => ({
            success: r.success,
            recordCount: r.recordCount,
            durationMs: r.durationMs,
            bytesReceived: r.bytesReceived ?? 0,
            syncedAt: r.syncedAt,
          })));
        }

        for (const record of records) {
          if (record.syncedAt > this._lastSeenSyncAt) {
            if (record.syncedAt > maxSyncAt) maxSyncAt = record.syncedAt;

            if (record.success && record.recordCount > 0) {
              const domain = connector?.config.domain ?? "custom";
              platformBus.emit(
                "system:gateway_data_received",
                {
                  connectorId,
                  domain,
                  recordCount: record.recordCount,
                  timestamp: record.syncedAt,
                  source: "db_refresh",
                },
                "system"
              );
            } else if (!record.success) {
              platformBus.emit(
                "system:gateway_sync_error",
                {
                  connectorId,
                  connectorName: connector?.config.name ?? connectorId,
                  error: record.error ?? "Unknown error",
                  source: "db_refresh",
                },
                "system"
              );
            }
          }
        }
      }

      this._lastSeenSyncAt = maxSyncAt;
    } catch {
      // Non-blocking
    }
  }
}

export const orchestrationEngine = new OrchestrationEngine();
