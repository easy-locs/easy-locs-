/**
 * generatePdfServerSide — calls the generate-pdf Edge Function.
 * Layer 3.1: Server-side PDF generation for automated flows.
 * Falls back to client-side generation if the Edge Function fails.
 */
import { supabase } from "@/integrations/supabase/client";

interface ServerPdfOptions {
  doc_type: string;
  title: string;
  country: string;
  data: Record<string, unknown>;
  org_id: string;
  upload_path?: string;
}

interface ServerPdfResult {
  success: boolean;
  pdf_url?: string;
  storage_path?: string;
  error?: string;
}

export async function generatePdfServerSide(options: ServerPdfOptions): Promise<ServerPdfResult> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-pdf", {
      body: options,
    });

    if (error) {
      console.warn("[generatePdfServerSide] Edge function error, falling back to client:", error);
      return { success: false, error: String(error) };
    }

    return data as ServerPdfResult;
  } catch (err) {
    console.warn("[generatePdfServerSide] Network error, falling back to client:", err);
    return { success: false, error: String(err) };
  }
}
