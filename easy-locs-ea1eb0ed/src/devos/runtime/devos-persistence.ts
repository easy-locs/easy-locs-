import type { IncidentRecord, ProofRecord, AuditResult } from '../types';

const STORAGE_KEYS = {
  incidents: 'devos:incidents',
  proofs: 'devos:proofs',
  audits: 'devos:audits',
  lastScan: 'devos:lastScan',
  runtimeLog: 'devos:runtimeLog',
} as const;

const MAX_ENTRIES = 200;

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full — trim old entries
    try {
      const trimmed = Array.isArray(value) ? (value as unknown[]).slice(-50) : value;
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch {
      // silent fail
    }
  }
}

export function persistIncident(incident: IncidentRecord): void {
  const existing = safeGet<IncidentRecord[]>(STORAGE_KEYS.incidents, []);
  existing.push(incident);
  safeSet(STORAGE_KEYS.incidents, existing.slice(-MAX_ENTRIES));
}

export function getPersistedIncidents(): IncidentRecord[] {
  return safeGet<IncidentRecord[]>(STORAGE_KEYS.incidents, []);
}

export function persistProof(proof: ProofRecord): void {
  const existing = safeGet<ProofRecord[]>(STORAGE_KEYS.proofs, []);
  existing.push(proof);
  safeSet(STORAGE_KEYS.proofs, existing.slice(-MAX_ENTRIES));
}

export function getPersistedProofs(): ProofRecord[] {
  return safeGet<ProofRecord[]>(STORAGE_KEYS.proofs, []);
}

export function persistAuditResult(audit: AuditResult): void {
  const existing = safeGet<AuditResult[]>(STORAGE_KEYS.audits, []);
  existing.push(audit);
  safeSet(STORAGE_KEYS.audits, existing.slice(-MAX_ENTRIES));
}

export function getPersistedAudits(): AuditResult[] {
  return safeGet<AuditResult[]>(STORAGE_KEYS.audits, []);
}

export function setLastScanTime(time: string): void {
  safeSet(STORAGE_KEYS.lastScan, time);
}

export function getLastScanTime(): string | null {
  return safeGet<string | null>(STORAGE_KEYS.lastScan, null);
}

export interface RuntimeLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
}

export function appendRuntimeLog(entry: Omit<RuntimeLogEntry, 'timestamp'>): void {
  const existing = safeGet<RuntimeLogEntry[]>(STORAGE_KEYS.runtimeLog, []);
  existing.push({ ...entry, timestamp: new Date().toISOString() });
  safeSet(STORAGE_KEYS.runtimeLog, existing.slice(-500));
}

export function getRuntimeLog(): RuntimeLogEntry[] {
  return safeGet<RuntimeLogEntry[]>(STORAGE_KEYS.runtimeLog, []);
}

export function clearAllDevOSData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    try { localStorage.removeItem(key); } catch {}
  });
}

export const devosPersistence = {
  persistIncident,
  getPersistedIncidents,
  persistProof,
  getPersistedProofs,
  persistAuditResult,
  getPersistedAudits,
  setLastScanTime,
  getLastScanTime,
  appendRuntimeLog,
  getRuntimeLog,
  clearAllDevOSData,
};
