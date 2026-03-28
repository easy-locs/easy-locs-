/**
 * useOnboardingSteps — Atomic: DB persistence for onboarding wizard steps.
 */
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
    supabase.from("profiles").select("onboarding_step, country, user_type").eq("id", userId).single()
      .then(({ data }) => {
        if (data?.onboarding_step) setStep(data.onboarding_step);
        if (data?.country) setCountry(data.country);
        if (data?.user_type) setSelectedType(data.user_type as UserType);
      });
  }, [userId]);

  const saveStep = useCallback(async (s: number) => {
    if (!userId) return;
    await supabase.from("profiles").update({ onboarding_step: s }).eq("id", userId);
  }, [userId]);

  const handleStep0Next = useCallback(async (navigate: (path: string) => void) => {
    if (!userId || !country || !selectedType) return;
    setSaving(true);
    const countryEntry = getCountryEntry(country) || { defaultLanguage: "en", currency: "EUR" };
    const autoLocale = (countryEntry.defaultLanguage || "en") as Locale;
    const autoCurrency = countryEntry.currency || "EUR";
    await supabase.from("profiles").update({ country, locale: autoLocale, currency: autoCurrency, user_type: selectedType }).eq("id", userId);
    setLocale(autoLocale);
    if (selectedType === "tenant") {
      await supabase.from("profiles").update({ onboarding_completed: true, onboarding_step: 7 }).eq("id", userId);
      setSaving(false);
      navigate("/tenant");
      return;
    }
    const { data: existingOrg } = await supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1).maybeSingle();
    if (!existingOrg) {
      const newOrgId = crypto.randomUUID();
      await supabase.from("orgs").insert({ id: newOrgId, owner_user_id: userId, name: "Mon organisation" });
      await supabase.from("org_members").insert({ org_id: newOrgId, user_id: userId, role: "owner" });
      await supabase.from("subscriptions").insert({ user_id: userId, plan: "trial", status: "trialing", trial_ends_at: new Date(Date.now() + 3 * 86400000).toISOString() });
    }
    setSaving(false);
    setStep(1);
    saveStep(1);
  }, [userId, country, selectedType, setLocale, saveStep]);

  const handleOwnerSave = useCallback(async (ownerForm: any) => {
    if (!userId || !ownerForm.full_name) return false;
    setSaving(true);
    const { data: orgData } = await supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1).single();
    if (!orgData) { setSaving(false); return false; }
    const { error } = await supabase.from("owner_profiles").insert({
      user_id: userId, org_id: orgData.org_id, ...ownerForm, country: country || "FR",
    });
    setSaving(false);
    if (error) return false;
    setStep(2); saveStep(2);
    return true;
  }, [userId, country, saveStep]);

  const handlePropertySave = useCallback(async (propertyForm: any): Promise<string | null> => {
    if (!userId || !propertyForm.label) return null;
    setSaving(true);
    const { data: orgData } = await supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1).single();
    if (!orgData) { setSaving(false); return null; }
    const { data: propData, error } = await supabase.from("properties").insert({
      org_id: orgData.org_id, user_id: userId, country: country || "FR",
      ...propertyForm, rental_mode: rentalMode || "long_term",
    }).select("id").single();
    setSaving(false);
    if (error) return null;
    if (propData) setSavedPropertyId(propData.id);
    const nextStep = rentalMode === "short_term" || rentalMode === "mixed" ? 3 : 4;
    setStep(nextStep); saveStep(nextStep);
    return propData?.id || null;
  }, [userId, country, rentalMode, saveStep]);

  const handleTenantSave = useCallback(async (tenantForm: any): Promise<boolean> => {
    if (!userId || !tenantForm.name) return false;
    setSaving(true);
    const { data: orgData } = await supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1).single();
    if (!orgData) { setSaving(false); return false; }
    const { error } = await supabase.from("tenants").insert({
      org_id: orgData.org_id, user_id: userId, property_id: savedPropertyId || null,
      ...tenantForm, lease_start: tenantForm.lease_start,
    });
    setSaving(false);
    if (error) return false;
    setStep(5); saveStep(5);
    return true;
  }, [userId, savedPropertyId, saveStep]);

  const handleFinish = useCallback(async (refreshProfile: () => Promise<void>, navigate: (path: string) => void) => {
    if (!userId) return;
    setSaving(true);
    await supabase.from("profiles").update({ onboarding_completed: true, onboarding_step: 7 }).eq("id", userId);
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
