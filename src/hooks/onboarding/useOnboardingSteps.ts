/**
 * useOnboardingSteps — Atomic: DB persistence for onboarding wizard steps.
 */
import { useState, useCallback, useEffect } from "react";
import * as obRepo from "@/repositories/onboarding.repository";
import type { Locale } from "@/lib/i18n";
import { getCountryEntry } from "@/lib/global-country-registry";

type UserType = "landlord" | "tenant";
type RentalMode = "long_term" | "short_term" | "mixed";

export function useOnboardingSteps(userId: string | undefined, setLocale: (l: Locale) => void) {
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [rentalMode, setRentalMode] = useState<RentalMode | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedPropertyId, setSavedPropertyId] = useState<string | null>(null);

  // Load saved progress
  useEffect(() => {
    if (!userId) return;
    obRepo.fetchOnboardingProgress(userId).then((data) => {
      if (data?.onboarding_step) setStep(data.onboarding_step);
      if (data?.country) setCountry(data.country);
      if (data?.user_type) setSelectedType(data.user_type as UserType);
    });
  }, [userId]);

  const saveStep = useCallback(async (s: number) => {
    if (!userId) return;
    await obRepo.saveOnboardingStep(userId, s);
  }, [userId]);

  const handleStep0Next = useCallback(async (navigate: (path: string) => void) => {
    if (!userId || !country || !selectedType) return;
    setSaving(true);
    const countryEntry = getCountryEntry(country) || { defaultLanguage: "en", currency: "EUR" };
    const autoLocale = (countryEntry.defaultLanguage || "en") as Locale;
    const autoCurrency = countryEntry.currency || "EUR";
    await obRepo.updateProfileCountryAndType(userId, { country, locale: autoLocale, currency: autoCurrency, user_type: selectedType });
    setLocale(autoLocale);
    if (selectedType === "tenant") {
      await obRepo.completeOnboarding(userId);
      setSaving(false);
      navigate("/tenant");
      return;
    }
    const existingOrg = await obRepo.fetchUserOrg(userId);
    if (!existingOrg) {
      await obRepo.createOrgForUser(userId);
    }
    setSaving(false);
    setStep(1);
    saveStep(1);
  }, [userId, country, selectedType, setLocale, saveStep]);

  const handleOwnerSave = useCallback(async (ownerForm: any) => {
    if (!userId || !ownerForm.full_name) return false;
    setSaving(true);
    const orgData = await obRepo.fetchUserOrg(userId);
    if (!orgData) { setSaving(false); return false; }
    try {
      await obRepo.insertOwnerProfile(userId, orgData.org_id, { ...ownerForm, email: ownerForm.email || "" }, country || "FR");
    } catch { setSaving(false); return false; }
    setSaving(false);
    setStep(2); saveStep(2);
    return true;
  }, [userId, country, saveStep]);

  const handlePropertySave = useCallback(async (propertyForm: any): Promise<string | null> => {
    if (!userId || !propertyForm.label) return null;
    setSaving(true);
    const orgData = await obRepo.fetchUserOrg(userId);
    if (!orgData) { setSaving(false); return null; }
    try {
      const propId = await obRepo.insertProperty(orgData.org_id, userId, propertyForm, country || "FR", rentalMode || "long_term");
      if (propId) setSavedPropertyId(propId);
      setSaving(false);
      const nextStep = rentalMode === "short_term" || rentalMode === "mixed" ? 3 : 4;
      setStep(nextStep); saveStep(nextStep);
      return propId;
    } catch { setSaving(false); return null; }
  }, [userId, country, rentalMode, saveStep]);

  const handleTenantSave = useCallback(async (tenantForm: any): Promise<boolean> => {
    if (!userId || !tenantForm.name) return false;
    setSaving(true);
    const orgData = await obRepo.fetchUserOrg(userId);
    if (!orgData) { setSaving(false); return false; }
    try {
      await obRepo.insertTenantOnboarding(orgData.org_id, userId, savedPropertyId || null, tenantForm);
    } catch { setSaving(false); return false; }
    setSaving(false);
    setStep(5); saveStep(5);
    return true;
  }, [userId, savedPropertyId, saveStep]);

  const handleFinish = useCallback(async (refreshProfile: () => Promise<void>, navigate: (path: string) => void) => {
    if (!userId) return;
    setSaving(true);
    await obRepo.completeOnboarding(userId);
    await refreshProfile();
    setSaving(false);
    navigate("/dashboard");
  }, [userId]);

  return {
    step, setStep, selectedType, setSelectedType, country, setCountry,
    rentalMode, setRentalMode, saving, savedPropertyId,
    saveStep, handleStep0Next, handleOwnerSave, handlePropertySave,
    handleTenantSave, handleFinish,
  };
}
