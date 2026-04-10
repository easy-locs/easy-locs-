/**
 * persistence.import_run.write — Persists the import run metadata.
 * ONE thing: write import run to DB.
 */
import { supabase } from "@/integrations/supabase/client";
import type { RawInput } from "../contracts";

export async function writeImportRun(params: {
  vertical: string;
  input: RawInput;
  status: string;
  resultJson: unknown;
}): Promise<string> {
  const db = supabase as any;
  const { data, error } = await db
    .from("onboarding_import_runs")
    .insert({
      vertical: params.vertical,
      input_json: params.input,
      status: params.status,
      result_json: params.resultJson,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}
