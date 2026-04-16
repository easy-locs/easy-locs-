import { useState, useRef, useCallback } from "react";
import { Camera, Upload, Loader2, Check, AlertTriangle, Edit3, RotateCcw, Scan } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { processImageWithTesseract, type OcrExtraction, type OcrField } from "@/services/ocr.service";

interface KycDocumentScannerProps {
  onFieldsExtracted?: (fields: Record<string, string>) => void;
  onComplete?: (extraction: OcrExtraction) => void;
}

export default function KycDocumentScanner({ onFieldsExtracted, onComplete }: KycDocumentScannerProps) {
  const { t } = useI18n();
  const [stage, setStage] = useState<"capture" | "processing" | "review">("capture");
  const [extraction, setExtraction] = useState<OcrExtraction | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const processImage = async (imageData: string | Blob) => {
    setStage("processing");
    try {
      const result = await processImageWithTesseract(imageData);
      setExtraction(result);
      const values: Record<string, string> = {};
      for (const field of result.fields) {
        values[field.key] = field.value;
      }
      setFieldValues(values);
      setStage("review");
    } catch {
      toast.error(t("ocr.failed") || "Failed to process document");
      setStage("capture");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);
      processImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      toast.error(t("ocr.camera_error") || "Camera access denied");
    }
  };

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);
    setPreviewUrl(dataUrl);
    processImage(dataUrl);
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);
  };

  const handleFieldEdit = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    onFieldsExtracted?.(fieldValues);
    if (extraction) onComplete?.(extraction);
    toast.success(t("ocr.fields_applied") || "Fields applied to form");
  };

  const handleReset = () => {
    setStage("capture");
    setExtraction(null);
    setFieldValues({});
    setPreviewUrl(null);
    setEditingField(null);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return "text-green-500";
    if (confidence >= 0.4) return "text-yellow-500";
    return "text-destructive";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.7) return t("ocr.high_confidence") || "High";
    if (confidence >= 0.4) return t("ocr.medium_confidence") || "Medium";
    return t("ocr.low_confidence") || "Low";
  };

  if (stage === "processing") {
    return (
      <div className="rounded-xl border border-border/20 bg-card/60 p-6 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Scan className="h-8 w-8 text-primary animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{t("ocr.processing") || "Scanning document..."}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("ocr.extracting") || "Extracting text and fields"}</p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  if (stage === "review" && extraction) {
    return (
      <div className="rounded-xl border border-border/20 bg-card/60 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-bold text-foreground">{t("ocr.results") || "Scan Results"}</h3>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">{t("ocr.type") || "Type"}:</span>
            <span className="font-medium text-foreground capitalize">
              {extraction.documentType.replace("_", " ")}
            </span>
          </div>
        </div>

        {previewUrl && (
          <div className="rounded-lg overflow-hidden border border-border/20 max-h-32">
            <img src={previewUrl} alt="Document" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="space-y-2">
          {extraction.fields.map((field) => (
            <div key={field.key} className="rounded-lg bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wide">
                  {field.label}
                </label>
                <span className={`text-[0.625rem] font-medium ${getConfidenceColor(field.confidence)}`}>
                  {getConfidenceLabel(field.confidence)}
                </span>
              </div>
              {editingField === field.key ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={fieldValues[field.key] || ""}
                    onChange={(e) => handleFieldEdit(field.key, e.target.value)}
                    className="flex-1 px-2 py-1 text-sm rounded border border-border/30 bg-background text-foreground"
                    autoFocus
                  />
                  <button
                    onClick={() => setEditingField(null)}
                    className="p-1 rounded bg-primary text-primary-foreground"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{fieldValues[field.key] || field.value}</p>
                  <button
                    onClick={() => setEditingField(field.key)}
                    className="p-1 rounded hover:bg-muted/40 text-muted-foreground"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                </div>
              )}
              {field.confidence < 0.5 && (
                <div className="flex items-center gap-1 mt-1 text-[0.625rem] text-yellow-600">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {t("ocr.verify_field") || "Please verify this field"}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border/30 text-foreground active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("ocr.rescan") || "Re-scan"}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            {t("ocr.apply_fields") || "Apply Fields"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/20 bg-card/60 p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Scan className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">{t("ocr.title") || "Document Scanner"}</h3>
          <p className="text-xs text-muted-foreground">{t("ocr.subtitle") || "Scan your ID to auto-fill KYC"}</p>
        </div>
      </div>

      {cameraActive ? (
        <div className="space-y-2">
          <div className="rounded-lg overflow-hidden border border-border/20 relative">
            <video ref={videoRef} className="w-full" playsInline muted />
            <div className="absolute inset-8 border-2 border-white/40 rounded-lg pointer-events-none" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={stopCamera}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border/30 text-foreground active:scale-[0.98] transition-all"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={capturePhoto}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              <Camera className="h-4 w-4" />
              {t("ocr.capture") || "Capture"}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={startCamera}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-border/30 active:scale-[0.98] transition-all hover:bg-muted/20"
          >
            <Camera className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium text-foreground">{t("ocr.take_photo") || "Take Photo"}</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-border/30 active:scale-[0.98] transition-all hover:bg-muted/20"
          >
            <Upload className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium text-foreground">{t("ocr.upload_photo") || "Upload Photo"}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
