import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

export interface KycDocument {
  id: string;
  user_id: string;
  provider_id: string | null;
  document_type: string;
  file_path: string;
  file_name: string | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export interface UserProfile {
  email: string | null;
  phone: string | null;
  created_at: string | null;
}

export interface PendingCase {
  providerId: string;
  userId: string;
  displayName: string;
  providerType: string;
  kycLevel: string;
  kycStatus: string;
  profilePhotoUrl: string | null;
  documents: KycDocument[];
  reviewHistory: KycDocument[];
  userProfile: UserProfile | null;
  onboardingStatus: string;
  createdAt: string | null;
}

type ProviderRow = {
  id: string;
  user_id: string;
  display_name: string;
  provider_type: string;
  kyc_level: string;
  kyc_status: string;
  profile_photo_url: string | null;
  onboarding_status: string;
  created_at: string;
};
type ProfileRow = {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string | null;
};

export async function checkAdminRole(userId: string) {
  const { data: isAdmin } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
  const { data: isOwner } = await db.rpc("has_role", { _user_id: userId, _role: "owner" });
  return { isAdmin: !!isAdmin, isOwner: !!isOwner };
}

export async function fetchKycQueue(statusFilter: string): Promise<PendingCase[]> {
  const { data: docs } = await db
    .from("kyc_documents")
    .select("*")
    .eq("status", statusFilter)
    .order("submitted_at", { ascending: true });

  if (!docs || docs.length === 0) return [];

  const userIds = [...new Set(docs.map((d: KycDocument) => d.user_id))];

  const [{ data: providers }, { data: profiles }, { data: allReviewedDocs }] = await Promise.all([
    db.from("providers")
      .select("id, user_id, display_name, provider_type, kyc_level, kyc_status, profile_photo_url, onboarding_status, created_at")
      .in("user_id", userIds),
    db.from("profiles")
      .select("id, email, phone, created_at")
      .in("id", userIds),
    db.from("kyc_documents")
      .select("*")
      .in("user_id", userIds)
      .neq("status", statusFilter)
      .order("submitted_at", { ascending: false }),
  ]);

  const providerMap = new Map((providers || []).map((p: ProviderRow) => [p.user_id, p]));
  const profileMap = new Map((profiles || []).map((p: ProfileRow) => [p.id, p]));
  const reviewHistoryMap = new Map<string, KycDocument[]>();
  for (const d of (allReviewedDocs || []) as KycDocument[]) {
    if (!reviewHistoryMap.has(d.user_id)) reviewHistoryMap.set(d.user_id, []);
    reviewHistoryMap.get(d.user_id)!.push(d);
  }

  const grouped: Record<string, PendingCase> = {};
  for (const doc of docs as KycDocument[]) {
    const provider = providerMap.get(doc.user_id);
    const profile = profileMap.get(doc.user_id);
    if (!grouped[doc.user_id]) {
      grouped[doc.user_id] = {
        providerId: provider?.id || "",
        userId: doc.user_id,
        displayName: provider?.display_name || "Unknown",
        providerType: provider?.provider_type || "commerce",
        kycLevel: provider?.kyc_level || "none",
        kycStatus: provider?.kyc_status || "not_started",
        profilePhotoUrl: provider?.profile_photo_url || null,
        documents: [],
        reviewHistory: reviewHistoryMap.get(doc.user_id) || [],
        userProfile: profile ? { email: profile.email, phone: profile.phone, created_at: profile.created_at } : null,
        onboardingStatus: provider?.onboarding_status || "not_started",
        createdAt: provider?.created_at || null,
      };
    }
    grouped[doc.user_id].documents.push(doc);
  }
  return Object.values(grouped);
}

export async function reviewKycDocument(documentId: string, action: "approve" | "reject", reason?: string) {
  const { data: session } = await db.auth.getSession();
  const token = session?.session?.access_token;

  const { data, error } = await db.functions.invoke("kyc-review", {
    body: { documentId, action, reason },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (error) throw error;
  return data;
}

export async function getKycDocumentPreviewUrl(filePath: string): Promise<string | null> {
  const { data } = await db.storage
    .from("kyc-documents")
    .createSignedUrl(filePath, 3600);
  return data?.signedUrl || null;
}

export async function fetchUserKycDocuments(userId: string) {
  const { data } = await db
    .from("kyc_documents")
    .select("*")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });
  return data || [];
}

export async function fetchProviderKycProfile(userId: string) {
  const { data } = await db
    .from("providers")
    .select("kyc_level, kyc_status")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function uploadKycDocument(params: {
  userId: string;
  documentType: string;
  file: File;
}) {
  const { userId, documentType, file } = params;
  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `${userId}/${documentType}-${Date.now()}.${ext}`;

  const { error: uploadError } = await db.storage
    .from("kyc-documents")
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    throw new Error("File upload failed: " + uploadError.message);
  }

  const { error: insertError } = await db
    .from("kyc_documents")
    .insert({
      user_id: userId,
      document_type: documentType,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      status: "pending",
      submitted_at: new Date().toISOString(),
    });

  if (insertError) throw insertError;

  await db
    .from("providers")
    .update({ kyc_status: "documents_pending" })
    .eq("user_id", userId);

  platformBus.emit("kyc:document_submitted", {
    userId,
    documentType,
  });
}

export async function uploadKycDocumentFile(userId: string, docType: string, file: File) {
  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `${userId}/${docType}-${Date.now()}.${ext}`;

  await db.storage.from("kyc-documents").upload(filePath, file, { upsert: false });

  await db.from("kyc_documents").insert({
    user_id: userId,
    document_type: docType,
    file_path: filePath,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    status: "pending",
  });
}
