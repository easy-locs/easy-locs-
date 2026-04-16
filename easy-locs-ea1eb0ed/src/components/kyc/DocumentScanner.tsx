import { useState, useCallback, useRef } from "react";
import { scanDocument, type OCRResult } from "@/lib/ocr/ocr-service";
import { Camera, Upload, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

interface DocumentField {
  label: string;
  value: string;
  confidence: number;
}

interface Props {
  onFieldsExtracted: (fields: DocumentField[]) => void;
  onRawText?: (text: string) => void;
  language?: string;
  acceptedTypes?: string;
}

export function DocumentScanner({
  onFieldsExtracted,
  onRawText,
  language,
  acceptedTypes = "image/jpeg,image/png,image/webp",
}: Props) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setScanning(true);
    setError(null);
    setResult(null);

    try {
      const ocrResult = await scanDocument(file, language);
      setResult(ocrResult);
      onFieldsExtracted(ocrResult.fields);
      onRawText?.(ocrResult.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }, [language, onFieldsExtracted, onRawText]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleRetry = useCallback(() => {
    setResult(null);
    setError(null);
    fileInputRef.current?.click();
  }, []);

  const fieldLabels: Record<string, string> = {
    name: "Full Name",
    date_of_birth: "Date of Birth",
    document_number: "Document Number",
    expiry_date: "Expiry Date",
    address: "Address",
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!scanning && !result && !error && (
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-4">
          <div className="flex justify-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 px-6 py-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Camera className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Take Photo</span>
            </button>
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute("capture");
                  fileInputRef.current.click();
                  fileInputRef.current.setAttribute("capture", "environment");
                }
              }}
              className="flex flex-col items-center gap-2 px-6 py-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Upload File</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Scan your ID card, passport, or utility bill to auto-fill your information
          </p>
        </div>
      )}

      {scanning && (
        <div className="border border-border rounded-xl p-8 text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm font-medium">Scanning document...</p>
          <p className="text-xs text-muted-foreground">This may take a few seconds</p>
        </div>
      )}

      {error && (
        <div className="border border-destructive/30 rounded-xl p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm text-destructive font-medium">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      )}

      {result && (
        <div className="border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            {result.needsManualReview ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium text-amber-600">
                  Low quality scan — please verify the extracted data
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-600">
                  Document scanned successfully
                </span>
              </>
            )}
          </div>

          {result.fields.length > 0 ? (
            <div className="space-y-2">
              {result.fields.map((field, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                >
                  <span className="text-xs text-muted-foreground">
                    {fieldLabels[field.label] ?? field.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{field.value}</span>
                    <span
                      className={`text-[0.625rem] px-1.5 py-0.5 rounded-full ${
                        field.confidence >= 0.8
                          ? "bg-green-100 text-green-700"
                          : field.confidence >= 0.6
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {Math.round(field.confidence * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No structured fields could be extracted. Please enter your details manually.
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Rescan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
