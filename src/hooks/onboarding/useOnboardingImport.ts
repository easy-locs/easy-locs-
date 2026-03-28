/**
 * useOnboardingImport — UI hook for triggering the shop import pipeline.
 */
import { useCallback, useState } from "react";
import { runImportPipeline } from "@/lib/onboarding/pipeline/run-import-pipeline";
import type { CanonicalShop } from "@/lib/onboarding/pipeline/canonical-shop.schema";

export function useOnboardingImport() {
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<CanonicalShop | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importShop = useCallback(async (source: string, raw: any) => {
    setImporting(true);
    setError(null);
    try {
      const result = await runImportPipeline(source, raw);
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
