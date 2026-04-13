import { engineObserver } from "./engine-observer";
import type { SupabaseClient } from "@supabase/supabase-js";

const SESSION_KEY = "el-engine-shared-ctx";
const STORAGE_VERSION = 1;
const SUPABASE_PERSIST_INTERVAL_MS = 60_000;
const CONTEXT_TABLE = "engine_shared_context";

async function supabaseSelectContext(supabase: SupabaseClient): Promise<string | null> {
  try {
    const { data, error } = await (supabase as SupabaseClient<Record<string, unknown>, "public", Record<string, unknown>>)
      .from(CONTEXT_TABLE)
      .select("payload")
      .eq("context_key", "main")
      .single();
    if (error || !data) return null;
    const row = data as { payload: string };
    return typeof row.payload === "string" ? row.payload : null;
  } catch {
    return null;
  }
}

async function supabaseUpsertContext(supabase: SupabaseClient, payload: string): Promise<void> {
  try {
    await (supabase as SupabaseClient<Record<string, unknown>, "public", Record<string, unknown>>)
      .from(CONTEXT_TABLE)
      .upsert({ context_key: "main", payload, updated_at: new Date().toISOString() });
  } catch {}
}

export interface TaxonomyRegistryEntry {
  canonicalKey: string;
  domain: string;
  labels: Record<string, string>;
  updatedAt: number;
  source: string;
}

export interface MediaRegistryEntry {
  mediaId: string;
  url: string;
  type: "image" | "video" | "document" | "audio";
  entityType: string;
  entityId: string;
  updatedAt: number;
}

export interface CanonicalTypeEntry {
  typeName: string;
  domain: string;
  schema: Record<string, unknown>;
  version: number;
  updatedAt: number;
}

export interface EngineMemoryEntry {
  key: string;
  value: unknown;
  engineId: string;
  domain: string;
  updatedAt: number;
  ttlMs?: number;
}

interface SharedContextStore {
  version: number;
  engine_memory: Record<string, EngineMemoryEntry>;
  taxonomy_registry: Record<string, TaxonomyRegistryEntry>;
  media_registry: Record<string, MediaRegistryEntry>;
  canonical_types: Record<string, CanonicalTypeEntry>;
  lastPersistedAt: number;
}

type ContextListener = (section: string, key: string, value: unknown) => void;

class EngineSharedContext {
  private store: SharedContextStore = this.createEmptyStore();
  private listeners: ContextListener[] = [];
  private _sessionDirty = false;
  private _remoteDirty = false;
  private persistDebounce: ReturnType<typeof setTimeout> | null = null;
  private supabasePersistInterval: ReturnType<typeof setInterval> | null = null;

  private createEmptyStore(): SharedContextStore {
    return {
      version: STORAGE_VERSION,
      engine_memory: {},
      taxonomy_registry: {},
      media_registry: {},
      canonical_types: {},
      lastPersistedAt: 0,
    };
  }

  initialize(): void {
    this.loadFromSession();
    this.loadFromSupabase();
    this.evictExpiredMemory();
    this.startSupabasePersistLoop();
  }

  private startSupabasePersistLoop(): void {
    if (this.supabasePersistInterval) clearInterval(this.supabasePersistInterval);
    this.supabasePersistInterval = setInterval(() => {
      if (this._remoteDirty) this.persistToSupabase();
    }, SUPABASE_PERSIST_INTERVAL_MS);
  }

  private loadFromSession(): void {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SharedContextStore;
        if (parsed.version === STORAGE_VERSION) {
          this.store = parsed;
          engineObserver.log("engine-shared-context", "shared-context", "info",
            `Context loaded from session: ${Object.keys(this.store.engine_memory).length} memories, ` +
            `${Object.keys(this.store.taxonomy_registry).length} taxonomy entries`);
          return;
        }
      }
    } catch {}
    this.store = this.createEmptyStore();
  }

  private loadFromSupabase(): void {
    try {
      import("@/integrations/supabase/client").then(({ supabase }) => {
        supabaseSelectContext(supabase).then(payload => {
          if (!payload) return;
          try {
            const remote = JSON.parse(payload) as SharedContextStore;
            if (remote.version !== STORAGE_VERSION) return;
            const remoteTs = remote.lastPersistedAt || 0;
            const localTs = this.store.lastPersistedAt || 0;
            if (remoteTs > localTs) {
              this.store = remote;
              this.persistToSession();
              engineObserver.log("engine-shared-context", "shared-context", "info",
                "Context restored from Supabase (remote was newer)");
            }
          } catch {}
        });
      }).catch(() => {});
    } catch {}
  }

  private schedulePersist(): void {
    if (this.persistDebounce) clearTimeout(this.persistDebounce);
    this.persistDebounce = setTimeout(() => {
      this.persistToSession();
    }, 1_000);
  }

  private persistToSession(): void {
    try {
      this.store.lastPersistedAt = Date.now();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.store));
      this._sessionDirty = false;
    } catch (err) {
      engineObserver.log("engine-shared-context", "shared-context", "warn",
        `Failed to persist context to session: ${String(err)}`);
    }
  }

  private persistToSupabase(): void {
    try {
      import("@/integrations/supabase/client").then(({ supabase }) => {
        const payload = JSON.stringify(this.store);
        supabaseUpsertContext(supabase, payload).then(() => {
          this._remoteDirty = false;
          engineObserver.log("engine-shared-context", "shared-context", "info",
            "Context persisted to Supabase");
        });
      }).catch(() => {});
    } catch {}
  }

  private evictExpiredMemory(): void {
    const now = Date.now();
    let evicted = 0;
    for (const [key, entry] of Object.entries(this.store.engine_memory)) {
      if (entry.ttlMs && now - entry.updatedAt > entry.ttlMs) {
        delete this.store.engine_memory[key];
        evicted++;
      }
    }
    if (evicted > 0) {
      engineObserver.log("engine-shared-context", "shared-context", "info",
        `Evicted ${evicted} expired memory entries`);
      this._sessionDirty = true;
      this._remoteDirty = true;
      this.schedulePersist();
    }
  }

  private notify(section: string, key: string, value: unknown): void {
    for (const listener of this.listeners) {
      try { listener(section, key, value); } catch {}
    }
  }

  onUpdate(listener: ContextListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  setMemory(engineId: string, domain: string, key: string, value: unknown, ttlMs?: number): void {
    const fullKey = `${engineId}:${domain}:${key}`;
    this.store.engine_memory[fullKey] = {
      key: fullKey,
      value,
      engineId,
      domain,
      updatedAt: Date.now(),
      ttlMs,
    };
    this._sessionDirty = true;
    this._remoteDirty = true;
    this.schedulePersist();
    this.notify("engine_memory", fullKey, value);
  }

  getMemory<T = unknown>(engineId: string, domain: string, key: string): T | undefined {
    const fullKey = `${engineId}:${domain}:${key}`;
    const entry = this.store.engine_memory[fullKey];
    if (!entry) return undefined;
    if (entry.ttlMs && Date.now() - entry.updatedAt > entry.ttlMs) {
      delete this.store.engine_memory[fullKey];
      return undefined;
    }
    return entry.value as T;
  }

  getMemoryByDomain(domain: string): EngineMemoryEntry[] {
    return Object.values(this.store.engine_memory).filter(e => e.domain === domain);
  }

  setTaxonomyEntry(key: string, entry: Omit<TaxonomyRegistryEntry, "updatedAt">): void {
    this.store.taxonomy_registry[key] = { ...entry, updatedAt: Date.now() };
    this._sessionDirty = true;
    this._remoteDirty = true;
    this.schedulePersist();
    this.notify("taxonomy_registry", key, this.store.taxonomy_registry[key]);
  }

  getTaxonomyEntry(key: string): TaxonomyRegistryEntry | undefined {
    return this.store.taxonomy_registry[key];
  }

  getTaxonomyByDomain(domain: string): TaxonomyRegistryEntry[] {
    return Object.values(this.store.taxonomy_registry).filter(e => e.domain === domain);
  }

  setMediaEntry(mediaId: string, entry: Omit<MediaRegistryEntry, "updatedAt">): void {
    this.store.media_registry[mediaId] = { ...entry, updatedAt: Date.now() };
    this._sessionDirty = true;
    this._remoteDirty = true;
    this.schedulePersist();
    this.notify("media_registry", mediaId, this.store.media_registry[mediaId]);
  }

  getMediaEntry(mediaId: string): MediaRegistryEntry | undefined {
    return this.store.media_registry[mediaId];
  }

  getMediaByEntity(entityType: string, entityId: string): MediaRegistryEntry[] {
    return Object.values(this.store.media_registry).filter(
      e => e.entityType === entityType && e.entityId === entityId
    );
  }

  setCanonicalType(typeName: string, entry: Omit<CanonicalTypeEntry, "updatedAt" | "version">): void {
    const existing = this.store.canonical_types[typeName];
    this.store.canonical_types[typeName] = {
      ...entry,
      typeName,
      version: (existing?.version ?? 0) + 1,
      updatedAt: Date.now(),
    };
    this._sessionDirty = true;
    this._remoteDirty = true;
    this.schedulePersist();
    this.notify("canonical_types", typeName, this.store.canonical_types[typeName]);
  }

  getCanonicalType(typeName: string): CanonicalTypeEntry | undefined {
    return this.store.canonical_types[typeName];
  }

  clearEngineMemory(engineId: string): void {
    const prefix = `${engineId}:`;
    for (const key of Object.keys(this.store.engine_memory)) {
      if (key.startsWith(prefix)) delete this.store.engine_memory[key];
    }
    this.schedulePersist();
  }

  forcePersist(): void {
    this.persistToSession();
    this.persistToSupabase();
  }

  getStats() {
    return {
      memoryEntries: Object.keys(this.store.engine_memory).length,
      taxonomyEntries: Object.keys(this.store.taxonomy_registry).length,
      mediaEntries: Object.keys(this.store.media_registry).length,
      canonicalTypes: Object.keys(this.store.canonical_types).length,
      lastPersistedAt: this.store.lastPersistedAt,
      dirty: this._sessionDirty || this._remoteDirty,
    };
  }

  getSnapshot() {
    return {
      version: this.store.version,
      engine_memory: { ...this.store.engine_memory },
      taxonomy_registry: { ...this.store.taxonomy_registry },
      media_registry: { ...this.store.media_registry },
      canonical_types: { ...this.store.canonical_types },
      lastPersistedAt: this.store.lastPersistedAt,
    };
  }
}

export const engineSharedContext = new EngineSharedContext();
