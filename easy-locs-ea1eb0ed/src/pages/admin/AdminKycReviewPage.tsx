import { useState } from "react";
import SubPageShell from "@/components/layout/SubPageShell";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  checkAdminRole,
  fetchKycQueue,
  reviewKycDocument,
  getKycDocumentPreviewUrl,
  type PendingCase,
} from "@/services/kyc.service";
import {
  Shield, CheckCircle2, XCircle, Clock, FileText, User,
  ChevronDown, ChevronUp, Eye, Filter, Loader2,
} from "lucide-react";

type ProviderType = "restaurant" | "hotel" | "taxi_driver" | "delivery_driver" | "service_provider" | "commerce";

const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  restaurant: "Restaurant",
  hotel: "Hotel",
  taxi_driver: "Taxi Driver",
  delivery_driver: "Delivery Driver",
  service_provider: "Service Provider",
  commerce: "Commerce",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  national_id: "National ID",
  passport: "Passport",
  driving_license: "Driving License",
  selfie: "Selfie",
  utility_bill: "Utility Bill",
  bank_statement: "Bank Statement",
  trade_license: "Trade License",
  tax_certificate: "Tax Certificate",
  residence_permit: "Residence Permit",
  taxi_license: "Taxi/VTC License",
  commercial_insurance: "Commercial Insurance",
  vehicle_registration: "Vehicle Registration",
  criminal_record: "Criminal Record",
  professional_certificate: "Professional Certificate",
};

export default function AdminKycReviewPage() {
  useUiEngine("admin-adminkycreviewpage");
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: userProfile } = useQuery({
    queryKey: ["admin-kyc-role-check", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return checkAdminRole(user.id);
    },
    enabled: !!user?.id,
  });

  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [reviewingDoc, setReviewingDoc] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isAdmin = !!userProfile && (userProfile.isAdmin || userProfile.isOwner);

  const { data: cases = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-kyc-queue", statusFilter],
    queryFn: () => fetchKycQueue(statusFilter),
    staleTime: 5000,
  });

  const filteredCases = filter === "all"
    ? cases
    : cases.filter((c) => c.providerType === filter);

  const handleReview = async (documentId: string, action: "approve" | "reject", reason?: string) => {
    setReviewingDoc(documentId);
    try {
      await reviewKycDocument(documentId, action, reason);
      toast.success(`Document ${action === "approve" ? "approved" : "rejected"} successfully`);
      setShowRejectModal(null);
      setRejectReason("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-kyc-queue"] });
    } catch (err: any) {
      toast.error(`Review failed: ${err.message || "Unknown error"}`);
    } finally {
      setReviewingDoc(null);
    }
  };

  const handlePreview = async (filePath: string) => {
    try {
      const url = await getKycDocumentPreviewUrl(filePath);
      if (url) {
        setPreviewUrl(url);
      } else {
        toast.error("Could not generate preview URL");
      }
    } catch {
      toast.error("Preview unavailable");
    }
  };

  const pendingCount = cases.reduce((sum, c) => sum + c.documents.length, 0);

  if (!isAdmin) {
    return (
      <SubPageShell title="Access Denied" onBack={() => navigate(-1)}>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Shield className="w-12 h-12 mb-4 text-red-400" />
          <p className="text-lg font-medium text-foreground">Unauthorized</p>
          <p className="text-sm mt-1">You need an admin role to access KYC reviews.</p>
        </div>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell noContentPad className="bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            KYC Review Queue
          </h1>
          <p className="text-xs text-muted-foreground">
            {pendingCount} document{pendingCount !== 1 ? "s" : ""} awaiting review
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold">
            {pendingCount}
          </span>
        )}
      </div>

      <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg bg-muted text-xs px-3 py-2 text-foreground border-0"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg bg-muted text-xs px-3 py-2 text-foreground border-0"
        >
          <option value="all">All Types</option>
          {Object.entries(PROVIDER_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && filteredCases.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
          <p className="text-sm text-muted-foreground">No documents in this queue</p>
        </div>
      )}

      <div className="px-4 space-y-3 pb-6">
        {filteredCases.map((kycCase) => {
          const isExpanded = expandedCase === kycCase.userId;
          return (
            <div key={kycCase.userId} className="rounded-2xl border border-border/20 bg-card overflow-hidden">
              <button
                onClick={() => setExpandedCase(isExpanded ? null : kycCase.userId)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {kycCase.profilePhotoUrl ? (
                    <img loading="lazy" src={kycCase.profilePhotoUrl} alt={`${kycCase.displayName || "User"} profile photo`} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{kycCase.displayName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {PROVIDER_TYPE_LABELS[kycCase.providerType as ProviderType] || kycCase.providerType}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {kycCase.documents.length} doc{kycCase.documents.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                  {kycCase.kycLevel}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-border/10 p-4 space-y-3">
                  <div className="rounded-xl bg-muted/20 p-3 space-y-2 text-xs text-muted-foreground">
                    <p className="text-sm font-semibold text-foreground mb-1">Dossier Context</p>
                    <div className="grid grid-cols-2 gap-2">
                      {kycCase.userProfile?.email && <div><span className="font-medium text-foreground">Email:</span> {kycCase.userProfile.email}</div>}
                      {kycCase.userProfile?.phone && <div><span className="font-medium text-foreground">Phone:</span> {kycCase.userProfile.phone}</div>}
                      <div><span className="font-medium text-foreground">Type:</span> {PROVIDER_TYPE_LABELS[kycCase.providerType as ProviderType] || kycCase.providerType}</div>
                      <div><span className="font-medium text-foreground">Onboarding:</span> {kycCase.onboardingStatus.replace(/_/g, " ")}</div>
                      <div><span className="font-medium text-foreground">KYC Status:</span> {kycCase.kycStatus.replace(/_/g, " ")}</div>
                      <div><span className="font-medium text-foreground">Provider Since:</span> {kycCase.createdAt ? new Date(kycCase.createdAt).toLocaleDateString() : "N/A"}</div>
                    </div>
                    {kycCase.reviewHistory.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/10">
                        <p className="text-xs font-medium text-foreground mb-1">Review History ({kycCase.reviewHistory.length} prior decisions)</p>
                        {kycCase.reviewHistory.slice(0, 5).map((h) => (
                          <div key={h.id} className="flex justify-between text-[10px]">
                            <span>{DOC_TYPE_LABELS[h.document_type] || h.document_type}</span>
                            <span className={h.status === "approved" ? "text-green-500" : h.status === "rejected" ? "text-red-500" : "text-muted-foreground"}>
                              {h.status} {h.reviewed_at ? `on ${new Date(h.reviewed_at).toLocaleDateString()}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {kycCase.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-xl bg-muted/30 p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {new Date(doc.submitted_at).toLocaleDateString()}
                        </span>
                      </div>

                      {doc.file_name && (
                        <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePreview(doc.file_path)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-foreground"
                        >
                          <Eye className="w-3 h-3" /> Preview
                        </button>
                        {statusFilter === "pending" && (
                          <>
                            <button
                              onClick={() => handleReview(doc.id, "approve")}
                              disabled={reviewingDoc === doc.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 text-xs font-medium text-green-500 disabled:opacity-50"
                            >
                              {reviewingDoc === doc.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setShowRejectModal(doc.id);
                                setRejectReason("");
                              }}
                              disabled={reviewingDoc === doc.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-xs font-medium text-red-500 disabled:opacity-50"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowRejectModal(null)} />
          <div className="relative w-full max-w-sm bg-card rounded-2xl p-6 mx-4 space-y-4">
            <h3 className="text-base font-bold text-foreground">Rejection Reason</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this document is being rejected..."
              className="w-full rounded-xl bg-muted p-3 text-sm text-foreground min-h-[100px] resize-none border-0"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview(showRejectModal, "reject", rejectReason)}
                disabled={!rejectReason.trim() || reviewingDoc === showRejectModal}
                className="flex-1 rounded-xl bg-red-500 text-white py-2.5 text-sm font-bold disabled:opacity-50"
              >
                {reviewingDoc === showRejectModal ? "Rejecting..." : "Reject Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={() => setPreviewUrl(null)} />
          <div className="relative max-w-lg max-h-[80vh] mx-4">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-10 right-0 text-white text-sm font-medium"
            >
              Close ✕
            </button>
            <img
              src={previewUrl}
              alt="Document preview"
              className="max-w-full max-h-[75vh] rounded-xl object-contain"
              onError={() => {
                setPreviewUrl(null);
                toast.error("Could not load document preview");
              }}
            />
          </div>
        </div>
      )}
    </SubPageShell>
  );
}
