import { useState, useCallback } from "react";
import { ScanLine, Upload, Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ExtractedData {
  full_name?: string | null;
  date_of_birth?: string | null;
  nationality?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  id_number?: string | null;
  id_type?: string | null;
  id_expiry_date?: string | null;
  email?: string | null;
  phone?: string | null;
  lease_start_date?: string | null;
  lease_end_date?: string | null;
  rent_amount?: number | null;
  charges_amount?: number | null;
  deposit_amount?: number | null;
  currency?: string | null;
  landlord_name?: string | null;
  property_address?: string | null;
}

interface DocumentScannerProps {
  onExtracted: (data: ExtractedData) => void;
  documentType?: string;
  locale?: string;
}

const FIELD_LABELS: Record<string, string> = {
  full_name: "Full Name",
  date_of_birth: "Date of Birth",
  nationality: "Nationality",
  address: "Address",
  city: "City",
  postal_code: "Postal Code",
  country: "Country",
  id_number: "ID Number",
  id_type: "ID Type",
  id_expiry_date: "ID Expiry",
  email: "Email",
  phone: "Phone",
  lease_start_date: "Lease Start",
  lease_end_date: "Lease End",
  rent_amount: "Rent Amount",
  charges_amount: "Charges",
  deposit_amount: "Deposit",
  currency: "Currency",
  landlord_name: "Landlord",
  property_address: "Property Address",
};

const DocumentScanner = ({ onExtracted, documentType, locale = "en" }: DocumentScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Please upload an image or PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Full = e.target?.result as string;
      const base64 = base64Full.split(",")[1];
      setPreview(base64Full);
      setScanning(true);
      setExtracted(null);

      try {
        const { data, error } = await supabase.functions.invoke("extract-document", {
          body: { image_base64: base64, document_type: documentType, locale },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const extractedData = data.extracted as ExtractedData;
        setExtracted(extractedData);
        toast.success("Document scanned successfully");
      } catch (err: any) {
        console.error("Scan error:", err);
        toast.error(err.message || "Failed to scan document");
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  }, [documentType, locale]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const applyExtracted = () => {
    if (extracted) {
      onExtracted(extracted);
      toast.success("Data applied to form");
    }
  };

  const nonNullFields = extracted
    ? Object.entries(extracted).filter(([, v]) => v != null && v !== "")
    : [];

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-accent/50 hover:bg-accent/5 transition-all cursor-pointer"
      >
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-2">
          {scanning ? (
            <>
              <Loader2 className="h-8 w-8 text-accent animate-spin" />
              <p className="text-sm text-muted-foreground">Scanning document with AI...</p>
            </>
          ) : (
            <>
              <ScanLine className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Scan a document</p>
              <p className="text-xs text-muted-foreground">
                Drop or click to upload — passport, ID, lease, invoice
              </p>
            </>
          )}
        </div>
      </div>

      {/* Preview & Results */}
      <AnimatePresence>
        {extracted && nonNullFields.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm font-semibold text-foreground">
                {nonNullFields.length} fields extracted
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {nonNullFields.map(([key, value]) => (
                <div key={key} className="flex items-start gap-2 py-1.5 px-2 rounded-lg bg-muted/30">
                  <FileText className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">{FIELD_LABELS[key] || key}</p>
                    <p className="text-xs font-medium text-foreground truncate">{String(value)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-border flex gap-2">
              <button onClick={applyExtracted} className="btn-primary text-xs h-9 flex-1">
                Apply to form
              </button>
              <button onClick={() => setExtracted(null)} className="btn-secondary text-xs h-9">
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentScanner;
