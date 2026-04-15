import { useState, useEffect, useRef } from "react";
import { Shield, FileText, Upload, CheckCircle2, Clock, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { platformBus } from "@/lib/shared/platform-bus";

type DocStatus = "verified" | "pending" | "required" | "rejected";

interface VerificationItem {
  key: string;
  label: string;
  description: string;
  documentType: string;
  status: DocStatus;
  rejectionReason?: string;
}

const BASE_VERIFICATIONS: Omit<VerificationItem, "status">[] = [
  { key: "selfie", label: "Selfie Verification", description: "A clear photo of your face", documentType: "selfie" },
  { key: "national_id", label: "National ID", description: "Government-issued ID (front & back)", documentType: "national_id" },
  { key: "trade_license", label: "Business Identity", description: "Trade license or business registration", documentType: "trade_license" },
  { key: "utility_bill", label: "Address Verification", description: "Utility bill or lease agreement", documentType: "utility_bill" },
  { key: "bank_statement", label: "Bank Statement", description: "Recent bank statement for payment verification", documentType: "bank_statement" },
  { key: "passport", label: "Passport", description: "Valid passport (bio page)", documentType: "passport" },
];

const statusConfig = {
  verified: { icon: CheckCircle2, color: "#22c55e", bg: "#22c55e15", label: "Verified" },
  pending: { icon: Clock, color: "hsl(var(--accent))", bg: "hsl(var(--accent) / 0.1)", label: "Pending Review" },
  required: { icon: AlertTriangle, color: "#ef4444", bg: "#ef444415", label: "Required" },
  rejected: { icon: XCircle, color: "#ef4444", bg: "#ef444415", label: "Rejected" },
};

export default function ProCompliance() {
  useUiEngine("pro-procompliance");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const { data: kycDocs = [], isLoading } = useQuery({
    queryKey: ["kyc-documents", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("kyc_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 10000,
  });

  const { data: provider } = useQuery({
    queryKey: ["provider-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("providers")
        .select("kyc_level, kyc_status")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 10000,
  });

  const verifications: VerificationItem[] = BASE_VERIFICATIONS.map((v) => {
    const doc = kycDocs.find((d: { document_type: string; status: string; rejection_reason?: string }) => d.document_type === v.documentType);
    let status: DocStatus = "required";
    let rejectionReason: string | undefined;
    if (doc) {
      if (doc.status === "approved") status = "verified";
      else if (doc.status === "pending") status = "pending";
      else if (doc.status === "rejected") {
        status = "rejected";
        rejectionReason = doc.rejection_reason || undefined;
      }
    }
    return { ...v, status, rejectionReason };
  });

  const verified = verifications.filter((v) => v.status === "verified").length;
  const total = verifications.length;

  const handleUpload = async (documentType: string) => {
    setUploadingType(documentType);
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || !uploadingType) {
      setUploadingType(null);
      return;
    }

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/${uploadingType}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        throw new Error("File upload failed: " + uploadError.message);
      }

      const { error: insertError } = await supabase
        .from("kyc_documents")
        .insert({
          user_id: user.id,
          document_type: uploadingType,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          status: "pending",
          submitted_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      await supabase
        .from("providers")
        .update({ kyc_status: "documents_pending" })
        .eq("user_id", user.id);

      platformBus.emit("kyc:document_submitted", {
        userId: user.id,
        documentType: uploadingType,
      });

      toast.success("Document uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["kyc-documents"] });
      queryClient.invalidateQueries({ queryKey: ["provider-profile"] });
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploadingType(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={onFileSelected}
      />

      <div>
        <h1 className="text-xl font-bold text-foreground">Compliance & Verification</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verify your identity to unlock all platform features
        </p>
      </div>

      {provider && (
        <div className="rounded-xl border border-border/20 bg-card p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Verification Progress</span>
            <span className="text-sm font-bold text-primary">{verified}/{total}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(verified / total) * 100}%` }}
            />
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>KYC Level: <strong className="text-foreground capitalize">{provider.kyc_level || "none"}</strong></span>
            <span>·</span>
            <span>Status: <strong className="text-foreground capitalize">{(provider.kyc_status || "not_started").replace(/_/g, " ")}</strong></span>
          </div>
        </div>
      )}

      {provider?.kyc_status === "rejected" && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-500">Document Rejected</p>
            <p className="text-xs text-muted-foreground mt-1">
              One or more documents were rejected. Please check the details and re-submit.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {verifications.map((item) => {
          const cfg = statusConfig[item.status];
          const Icon = cfg.icon;
          const isUploading = uploadingType === item.documentType;
          return (
            <div
              key={item.key}
              className="rounded-xl border border-border/20 bg-card p-4 flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: cfg.bg }}
              >
                <Icon size={18} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{item.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                {item.status === "rejected" && item.rejectionReason && (
                  <div className="text-xs text-red-400 mt-1">Reason: {item.rejectionReason}</div>
                )}
              </div>
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-bold shrink-0"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </span>
              {(item.status === "required" || item.status === "rejected") && (
                <button
                  onClick={() => handleUpload(item.documentType)}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shrink-0 disabled:opacity-50"
                >
                  {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  Upload
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border/20 bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield size={16} className="text-primary" />
          Anti-Scam Protection
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Phone OTP", status: "Active", color: "#22c55e" },
            { label: "Identity Check", status: provider?.kyc_level === "none" ? "Pending" : "Active", color: provider?.kyc_level === "none" ? "hsl(var(--accent))" : "#22c55e" },
            { label: "Payment Pattern", status: "Monitoring", color: "#3b82f6" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-muted/50 p-3 text-center">
              <div className="text-xs font-semibold" style={{ color: item.color }}>{item.status}</div>
              <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
