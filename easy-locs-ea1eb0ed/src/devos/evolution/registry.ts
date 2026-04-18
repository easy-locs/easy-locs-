import type { ProposalStatus, RegistryEntry } from './types';
import { getEvolutionConfig } from './config';

let idCounter = 0;

function djb2(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function makeContentHash(parts: {
  intent: string;
  domain: string;
  files: string[];
}): string {
  const normalized = `${parts.domain}::${parts.intent}::${[...parts.files].sort().join('|')}`;
  return `ch_${djb2(normalized)}`;
}

export function makeProposalId(): string {
  idCounter += 1;
  return `evo-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

const entries = new Map<string, RegistryEntry>();
const byContentHash = new Map<string, string>(); // hash -> latest entry id

export interface RegisterCheckOk {
  ok: true;
  entry: RegistryEntry;
}
export interface RegisterCheckFail {
  ok: false;
  reason: 'duplicate-id' | 'duplicate-content' | 'banned-content-hash';
  detail: string;
  existingEntryId?: string;
}
export type RegisterCheck = RegisterCheckOk | RegisterCheckFail;

export function registerProposal(input: {
  id: string;
  contentHash: string;
  parentProposalId: string | null;
}): RegisterCheck {
  if (entries.has(input.id)) {
    return {
      ok: false,
      reason: 'duplicate-id',
      detail: `Task id ${input.id} already exists in registry`,
      existingEntryId: input.id,
    };
  }

  const existingId = byContentHash.get(input.contentHash);
  if (existingId) {
    const existing = entries.get(existingId);
    if (existing) {
      if (existing.bannedUntil && Date.parse(existing.bannedUntil) > Date.now()) {
        return {
          ok: false,
          reason: 'banned-content-hash',
          detail: `Content hash ${input.contentHash} is banned until ${existing.bannedUntil}`,
          existingEntryId: existingId,
        };
      }
      if (
        existing.status === 'suggested' ||
        existing.status === 'approved' ||
        existing.status === 'executing' ||
        existing.status === 'completed'
      ) {
        return {
          ok: false,
          reason: 'duplicate-content',
          detail: `Content hash ${input.contentHash} already has active entry ${existingId} (${existing.status})`,
          existingEntryId: existingId,
        };
      }
    }
  }

  const lineage: string[] = input.parentProposalId
    ? [...(entries.get(input.parentProposalId)?.lineage ?? []), input.parentProposalId]
    : [];

  const entry: RegistryEntry = {
    id: input.id,
    contentHash: input.contentHash,
    lineage,
    createdAt: new Date().toISOString(),
    status: 'suggested',
  };

  entries.set(entry.id, entry);
  byContentHash.set(entry.contentHash, entry.id);

  return { ok: true, entry };
}

export function updateStatus(id: string, status: ProposalStatus): RegistryEntry | null {
  const entry = entries.get(id);
  if (!entry) return null;
  const next: RegistryEntry = { ...entry, status };
  if (status === 'rolled-back') {
    next.rolledBackAt = new Date().toISOString();
    next.bannedUntil = new Date(Date.now() + getEvolutionConfig().BAN_DURATION_MS).toISOString();
  }
  entries.set(id, next);
  return next;
}

export function getEntry(id: string): RegistryEntry | null {
  return entries.get(id) ?? null;
}

export function getLineage(id: string): string[] {
  return entries.get(id)?.lineage ?? [];
}

export function listEntries(): RegistryEntry[] {
  return Array.from(entries.values());
}

export function hydrateRegistry(items: RegistryEntry[]): number {
  let n = 0;
  for (const e of items) {
    if (!e || typeof e.id !== 'string') continue;
    if (entries.has(e.id)) continue;
    entries.set(e.id, e);
    n += 1;
  }
  return n;
}

export function countActive(): number {
  let n = 0;
  for (const e of entries.values()) {
    if (e.status === 'approved' || e.status === 'executing') n += 1;
  }
  return n;
}

export function clearRegistryForTests(): void {
  entries.clear();
  byContentHash.clear();
  idCounter = 0;
}
