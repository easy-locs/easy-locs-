/**
 * useOnboardingImport — UI hook for triggering the shop import pipeline.
 * NOW uses src/lib/import-engine as canonical source.
 */
import { useCallback, useState } from "react";
import { runImportEngine, type ImportResult, type SourceEntityRecord, type Vertical } from "@/lib/import-engine";

export function useOnboardingImport() {
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importShop = useCallback(async (
    vertical: Vertical,
    records: SourceEntityRecord[],
  ) => {
    setImporting(true);
    setError(null);
    try {
      const result = runImportEngine({ vertical }, records);
      setLastResult(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setImporting(false);
    }
  }, []);

  return { importShop, importing, lastResult, error };
}
