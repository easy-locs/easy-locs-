import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { KYCLevel } from "@/lib/systems/compliance-engine";
import { getKYCRequirement, getMissingDocuments, type DocumentType } from "@/lib/systems/compliance-engine";

const KYC_LEVEL_ORDER: KYCLevel[] = ["none", "basic", "standard", "enhanced", "full"];

function levelIndex(level: KYCLevel): number {
  return KYC_LEVEL_ORDER.indexOf(level);
}

interface ProviderKycInfo {
  id: string;
  kyc_level: string | null;
  kyc_status: string | null;
  user_id: string;
}

export interface KycGateResult {
  loading: boolean;
  allowed: boolean;
  currentLevel: KYCLevel;
  requiredLevel: KYCLevel;
  kycStatus: string;
  missingDocuments: DocumentType[];
  provider: ProviderKycInfo | null;
}

export function useKycGate(requiredLevel: KYCLevel): KycGateResult {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["kyc-gate", user?.id, requiredLevel],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: provider } = await supabase
        .from("providers")
        .select("id, kyc_level, kyc_status, user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!provider) {
        return {
          currentLevel: "none" as KYCLevel,
          kycStatus: "not_started",
          provider: null,
        };
      }

      const { data: docs } = await supabase
        .from("kyc_documents")
        .select("document_type, status")
        .eq("user_id", user.id);

      const submittedTypes = (docs || [])
        .filter((d: { document_type: string; status: string }) => d.status === "approved")
        .map((d: { document_type: string; status: string }) => d.document_type as DocumentType);

      return {
        currentLevel: (provider.kyc_level || "none") as KYCLevel,
        kycStatus: provider.kyc_status || "not_started",
        submittedTypes,
        provider,
      };
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  if (isLoading || !data) {
    return {
      loading: isLoading,
      allowed: false,
      currentLevel: "none",
      requiredLevel,
      kycStatus: "not_started",
      missingDocuments: [],
      provider: null,
    };
  }

  const currentIdx = levelIndex(data.currentLevel);
  const requiredIdx = levelIndex(requiredLevel);
  const allowed = currentIdx >= requiredIdx;

  const requirement = getKYCRequirement(requiredLevel);
  const missing = getMissingDocuments(
    data.submittedTypes || [],
    requirement.requiredDocuments
  );

  return {
    loading: false,
    allowed,
    currentLevel: data.currentLevel,
    requiredLevel,
    kycStatus: data.kycStatus,
    missingDocuments: missing,
    provider: data.provider,
  };
}

export function requireKycLevel(kycLevel: KYCLevel, requiredLevel: KYCLevel): { allowed: boolean; reason?: string } {
  const currentIdx = levelIndex(kycLevel);
  const requiredIdx = levelIndex(requiredLevel);
  if (currentIdx >= requiredIdx) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `KYC level ${requiredLevel} required. Current level: ${kycLevel}. Please complete your verification.`,
  };
}
