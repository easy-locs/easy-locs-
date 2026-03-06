import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getCountryConfig, formatCurrency } from "@/lib/country-config";
import { getTenantLabels, type TenantLabels } from "@/lib/tenant-i18n";
import { getCountryProfile, type CountryProfile } from "@/lib/country-profile";

interface TenantPropertyInfo {
  tenantId: string | null;
  tenantName: string;
  orgId: string | null;
  propertyId: string | null;
  propertyCountry: string;
  loading: boolean;
  /** Country-config labels (shared with landlord side) */
  L: ReturnType<typeof getCountryConfig>["labels"];
  /** Tenant-specific labels */
  T: TenantLabels;
  /** Format currency for property country */
  fmt: (n: number) => string;
  /** date-fns locale string e.g. "fr-FR" */
  locale: string;
  /** Full country profile for strict isolation */
  profile: CountryProfile;
  /** Languages available for the tenant in this property's country */
  tenantLanguages: string[];
}

export function useTenantProperty(): TenantPropertyInfo {
  const { user, userCountry } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [propertyCountry, setPropertyCountry] = useState<string>(userCountry || "FR");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetch = async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, org_id, property_id, name, rent_amount, charges_amount")
        .eq("tenant_user_id", user.id)
        .limit(1)
        .single();

      if (!tenant) { setLoading(false); return; }

      setTenantId(tenant.id);
      setTenantName(tenant.name || "");
      setOrgId(tenant.org_id);
      setPropertyId(tenant.property_id);

      if (tenant.property_id) {
        const { data: prop } = await supabase
          .from("properties")
          .select("country")
          .eq("id", tenant.property_id)
          .maybeSingle();
        if (prop?.country) setPropertyCountry(prop.country);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const config = useMemo(() => getCountryConfig(propertyCountry), [propertyCountry]);
  const L = config.labels;
  const T = useMemo(() => getTenantLabels(propertyCountry), [propertyCountry]);
  const fmt = (n: number) => formatCurrency(n, propertyCountry);
  const profile = useMemo(() => getCountryProfile(propertyCountry), [propertyCountry]);
  const tenantLanguages = profile.tenantLanguages;

  return { tenantId, tenantName, orgId, propertyId, propertyCountry, loading, L, T, fmt, locale: config.locale, profile, tenantLanguages };
}
