/**
 * useGlobalProfile — Auto-fill identity & address across the entire app.
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import * as profileRepo from "@/repositories/profile.repository";

export interface GlobalProfile {
  firstName: string; lastName: string; fullName: string; email: string; phone: string;
  dateOfBirth: string; nationality: string; idNumber: string;
  address: string; city: string; postalCode: string; country: string;
  companyName: string; taxId: string; signatureUrl: string;
  bankName: string; bankIban: string; bankBic: string;
  formattedAddress: string; personType: "individual" | "company";
}

const EMPTY_PROFILE: GlobalProfile = {
  firstName: "", lastName: "", fullName: "", email: "", phone: "",
  dateOfBirth: "", nationality: "", idNumber: "",
  address: "", city: "", postalCode: "", country: "FR",
  companyName: "", taxId: "", signatureUrl: "",
  bankName: "", bankIban: "", bankBic: "",
  formattedAddress: "", personType: "individual",
};

export function useGlobalProfile() {
  const { user, orgId, userType } = useAuth();
  const [profile, setProfile] = useState<GlobalProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const baseProfile = await profileRepo.fetchBaseProfile(user.id);
      const p: GlobalProfile = { ...EMPTY_PROFILE };
      if (baseProfile) {
        p.email = baseProfile.email || "";
        p.firstName = (baseProfile as any).first_name || "";
        p.lastName = (baseProfile as any).last_name || "";
        p.fullName = baseProfile.name || [p.firstName, p.lastName].filter(Boolean).join(" ");
        p.phone = (baseProfile as any).phone || "";
        p.dateOfBirth = (baseProfile as any).date_of_birth || "";
        p.nationality = (baseProfile as any).nationality || "";
        p.idNumber = (baseProfile as any).id_number || "";
        p.address = (baseProfile as any).address || "";
        p.city = (baseProfile as any).city || "";
        p.postalCode = (baseProfile as any).postal_code || "";
        p.country = baseProfile.country || "FR";
        p.companyName = (baseProfile as any).company_name || "";
        p.taxId = (baseProfile as any).tax_id || "";
        p.signatureUrl = baseProfile.signature_url || "";
      }
      if (userType === "landlord" && orgId) {
        const ownerProfile = await profileRepo.fetchOwnerProfile(orgId);
        if (ownerProfile) {
          p.fullName = ownerProfile.full_name || p.fullName;
          p.companyName = ownerProfile.company_name || p.companyName;
          p.personType = (ownerProfile.person_type as "individual" | "company") || "individual";
          p.address = ownerProfile.address || p.address;
          p.city = ownerProfile.city || p.city;
          p.postalCode = ownerProfile.postal_code || p.postalCode;
          p.country = ownerProfile.country || p.country;
          p.email = ownerProfile.email || p.email;
          p.phone = ownerProfile.phone || p.phone;
          p.taxId = ownerProfile.tax_id || p.taxId;
          p.bankName = ownerProfile.bank_name || "";
          p.bankIban = ownerProfile.bank_iban || "";
          p.bankBic = ownerProfile.bank_bic || "";
        }
      }
      if (userType === "tenant") {
        const tenantData = await profileRepo.fetchTenantProfile(user.id);
        if (tenantData) {
          p.fullName = tenantData.name || p.fullName;
          p.email = tenantData.email || p.email;
          p.phone = tenantData.phone || p.phone;
          p.dateOfBirth = tenantData.birth_date || p.dateOfBirth;
          p.nationality = tenantData.nationality || p.nationality;
          p.address = tenantData.current_address || p.address;
        }
      }
      p.formattedAddress = [p.address, p.postalCode, p.city].filter(Boolean).join(", ");
      if (!p.fullName && (p.firstName || p.lastName)) p.fullName = [p.firstName, p.lastName].filter(Boolean).join(" ");
      setProfile(p);
    } catch (err) {
      console.error("[GlobalProfile] load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, orgId, userType]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const saveProfile = useCallback(async (updates: Partial<GlobalProfile>): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    try {
      const merged = { ...profile, ...updates };
      const fullName = merged.fullName || [merged.firstName, merged.lastName].filter(Boolean).join(" ");
      await profileRepo.updateProfile(user.id, {
        name: fullName, first_name: merged.firstName, last_name: merged.lastName,
        phone: merged.phone, address: merged.address, city: merged.city,
        postal_code: merged.postalCode, country: merged.country,
        date_of_birth: merged.dateOfBirth || null, nationality: merged.nationality,
        id_number: merged.idNumber, company_name: merged.companyName,
        tax_id: merged.taxId, signature_url: merged.signatureUrl,
      });
      if (userType === "landlord" && orgId) {
        await profileRepo.upsertOwnerProfile({
          org_id: orgId, user_id: user.id, full_name: fullName,
          company_name: merged.companyName || null, person_type: merged.personType || "individual",
          address: merged.address || null, postal_code: merged.postalCode || null,
          city: merged.city || null, country: merged.country || null,
          email: merged.email || null, phone: merged.phone || null,
          tax_id: merged.taxId || null, bank_name: merged.bankName || null,
          bank_iban: merged.bankIban || null, bank_bic: merged.bankBic || null,
        });
      }
      setProfile({ ...merged, fullName, formattedAddress: [merged.address, merged.postalCode, merged.city].filter(Boolean).join(", ") });
      return true;
    } catch (err) {
      console.error("[GlobalProfile] save error:", err);
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, orgId, userType, profile]);

  const getDocumentAutoFill = useCallback((role: "landlord" | "tenant" = "landlord"): Record<string, unknown> => {
    const cc = getCountryEntryOrDefault(profile.country);
    if (role === "landlord") {
      return { landlordName: profile.personType === "company" ? (profile.companyName || profile.fullName) : profile.fullName, landlordAddress: profile.formattedAddress, landlordEmail: profile.email, landlordPhone: profile.phone, landlordTaxId: profile.taxId, landlordBankName: profile.bankName, landlordBankIban: profile.bankIban, landlordBankBic: profile.bankBic, senderName: profile.fullName, senderAddress: profile.formattedAddress, hostName: profile.fullName, companyName: profile.companyName, taxId: profile.taxId, bankName: profile.bankName, bankIban: profile.bankIban, bankBic: profile.bankBic };
    }
    return { tenantName: profile.fullName, tenantEmail: profile.email, tenantPhone: profile.phone, tenantAddress: profile.formattedAddress, tenantBirthDate: profile.dateOfBirth, tenantNationality: profile.nationality, tenantIdNumber: profile.idNumber, recipientName: profile.fullName, recipientAddress: profile.formattedAddress, guestName: profile.fullName };
  }, [profile]);

  return { profile, loading, saving, saveProfile, refreshProfile: loadProfile, getDocumentAutoFill };
}
