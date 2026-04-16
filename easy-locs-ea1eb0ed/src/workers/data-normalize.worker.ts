import { exposeWorkerMethods } from "./worker-rpc";

export interface NormalizeFieldsRequest {
  records: Record<string, unknown>[];
  fieldMap: Record<string, string>;
  trimStrings?: boolean;
  lowercaseKeys?: boolean;
}

export interface NormalizeFieldsResult {
  records: Record<string, unknown>[];
  transformedCount: number;
}

function normalizeFields(request: NormalizeFieldsRequest): NormalizeFieldsResult {
  const { records, fieldMap, trimStrings = true, lowercaseKeys = false } = request;
  let transformedCount = 0;

  const normalized = records.map((record) => {
    const out: Record<string, unknown> = {};
    let changed = false;

    for (const [key, value] of Object.entries(record)) {
      const mappedKey = fieldMap[key] ?? (lowercaseKeys ? key.toLowerCase() : key);
      let mappedValue = value;

      if (trimStrings && typeof mappedValue === "string") {
        mappedValue = mappedValue.trim();
      }

      if (mappedKey !== key || mappedValue !== value) changed = true;
      out[mappedKey] = mappedValue;
    }

    if (changed) transformedCount++;
    return out;
  });

  return { records: normalized, transformedCount };
}

export interface DeduplicateRequest {
  records: Record<string, unknown>[];
  keyField: string;
  strategy: "first" | "last" | "merge";
}

export interface DeduplicateResult {
  records: Record<string, unknown>[];
  duplicatesRemoved: number;
}

function deduplicateRecords(request: DeduplicateRequest): DeduplicateResult {
  const { records, keyField, strategy } = request;
  const map = new Map<string, Record<string, unknown>>();

  for (const record of records) {
    const key = String(record[keyField] ?? "");
    if (!key) continue;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...record });
    } else if (strategy === "last") {
      map.set(key, { ...record });
    } else if (strategy === "merge") {
      map.set(key, { ...existing, ...record });
    }
  }

  return {
    records: Array.from(map.values()),
    duplicatesRemoved: records.length - map.size,
  };
}

export interface ValidateRequest {
  records: Record<string, unknown>[];
  requiredFields: string[];
}

export interface ValidateResult {
  valid: Record<string, unknown>[];
  invalid: Array<{ record: Record<string, unknown>; missingFields: string[] }>;
}

function validateRecords(request: ValidateRequest): ValidateResult {
  const valid: Record<string, unknown>[] = [];
  const invalid: Array<{ record: Record<string, unknown>; missingFields: string[] }> = [];

  for (const record of request.records) {
    const missing = request.requiredFields.filter(
      (f) => record[f] === undefined || record[f] === null || record[f] === "",
    );
    if (missing.length === 0) {
      valid.push(record);
    } else {
      invalid.push({ record, missingFields: missing });
    }
  }

  return { valid, invalid };
}

const workerMethods = {
  normalizeFields,
  deduplicate: deduplicateRecords,
  validate: validateRecords,
};

export type DataNormalizeWorkerMethods = typeof workerMethods;

exposeWorkerMethods(workerMethods);
