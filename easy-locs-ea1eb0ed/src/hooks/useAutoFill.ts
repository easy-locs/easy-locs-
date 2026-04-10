import { useCallback, useEffect, useState } from "react";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import type { Property, Tenant } from "@/hooks/useRentalData";

export interface OwnerProfile {
  id: string;
  full_name: string;
  company_name: string | null;
  person_type: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  bank_name: string | null;
  bank_iban: string | null;
  bank_bic: string | null;
}

/**
 * Hook for auto-filling form data from tenant/property/owner selection.
 * Includes owner profile (landlord) data for complete document generation.
 */
export function useAutoFill(properties: Property[], tenants: Tenant[]) {
  const { orgId } = useAuth();
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [inventoryReports, setInventoryReports] = useState<any[]>([]);

  // Load owner profile
  useEffect(() => {
    if (!orgId) return;
    db
      .from("owner_profiles")
      .select("*")
      .eq("org_id", orgId)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setOwnerProfile(data as OwnerProfile);
      });
  }, [orgId]);

  // Load inventory reports
  useEffect(() => {
    if (!orgId) return;
    db
      .from("inventory_reports")
      .select("id, property_id, tenant_id, report_type, report_date, status")
      .eq("org_id", orgId)
      .order("report_date", { ascending: false })
      .then(({ data }) => {
        if (data) setInventoryReports(data);
      });
  }, [orgId]);

  /** Auto-fill from tenant selection → fills name, contact, property, financials */
  const fillFromTenant = useCallback((tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return null;

    const property = tenant.property_id ? properties.find(p => p.id === tenant.property_id) : null;

    const fullAddress = property
      ? `${property.address}, ${property.postal_code} ${property.city}`
      : "";

    return {
      tenantId: tenant.id,
      propertyId: tenant.property_id,
      // Tenant identity
      tenantName: tenant.name,
      recipientName: tenant.name,
      guestName: tenant.name,
      fullName: tenant.name,
      tenantEmail: tenant.email,
      recipientEmail: tenant.email,
      tenantPhone: tenant.phone,
      recipientPhone: tenant.phone,
      tenantAddress: tenant.current_address || "",
      currentAddress: tenant.current_address || "",
      recipientAddress: tenant.current_address || "",
      // Personal info
      tenantBirthDate: tenant.birth_date || "",
      birthDate: tenant.birth_date || "",
      tenantBirthPlace: tenant.birth_place || "",
      birthPlace: tenant.birth_place || "",
      tenantNationality: tenant.nationality || "",
      nationality: tenant.nationality || "",
      tenantProfession: tenant.profession || "",
      profession: tenant.profession || "",
      // Guarantor
      guarantorName: tenant.guarantor_name || "",
      guarantorPhone: tenant.guarantor_phone || "",
      // Lease
      leaseStart: tenant.lease_start || "",
      startDate: tenant.lease_start || "",
      leaseEnd: tenant.lease_end || "",
      endDate: tenant.lease_end || "",
      leaseType: tenant.lease_type,
      // Financials
      rentAmount: tenant.rent_amount,
      chargesAmount: tenant.charges_amount,
      depositAmount: tenant.deposit_amount,
      totalAmount: (Number(tenant.rent_amount) || 0) + (Number(tenant.charges_amount) || 0),
      ...(property ? {
        propertyLabel: property.label,
        propertyAddress: fullAddress,
        fullAddress,
        address: fullAddress,
        propertyPostalCode: property.postal_code,
        propertyZipCode: property.postal_code,
        propertyCity: property.city,
        propertyCountry: property.country || "",
        propertyType: property.property_type,
        propertySurface: property.surface,
        propertyRooms: property.rooms,
        surface: property.surface,
        rooms: property.rooms,
        propertyFloor: property.floor,
        propertyHeating: property.heating,
        propertyFurnished: property.furnished,
        furnished: property.furnished ? "yes" : "no",
        propertyBuildingName: property.building_name || "",
        propertyLotNumber: property.lot_number || "",
        propertyReference: property.lot_number || property.label || "",
      } : {}),
    };
  }, [properties, tenants]);

  /** Auto-fill from property selection → fills address + financial defaults */
  const fillFromProperty = useCallback((propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return null;

    const fullAddress = `${property.address}, ${property.postal_code} ${property.city}`;

    return {
      propertyId: property.id,
      propertyLabel: property.label,
      propertyAddress: fullAddress,
      fullAddress,
      address: fullAddress,
      propertyPostalCode: property.postal_code,
      propertyZipCode: property.postal_code,
      propertyCity: property.city,
      propertyCountry: property.country || "",
      propertyType: property.property_type,
      propertySurface: property.surface,
      propertyRooms: property.rooms,
      surface: property.surface,
      rooms: property.rooms,
      propertyFloor: property.floor,
      propertyHeating: property.heating,
      propertyFurnished: property.furnished,
      furnished: property.furnished ? "yes" : "no",
      propertyBuildingName: property.building_name || "",
      propertyLotNumber: property.lot_number || "",
      propertyReference: property.lot_number || property.label || "",
      rentAmount: property.monthly_rent,
      chargesAmount: property.monthly_charges,
      depositAmount: property.deposit_amount,
      totalAmount: (Number(property.monthly_rent) || 0) + (Number(property.monthly_charges) || 0),
    };
  }, [properties]);

  /** Auto-fill owner/landlord data from owner_profiles */
  const fillFromOwner = useCallback(() => {
    if (!ownerProfile) return null;
    const ownerAddress = [ownerProfile.address, ownerProfile.postal_code, ownerProfile.city]
      .filter(Boolean).join(", ");
    const landlordName = ownerProfile.person_type === "company"
      ? ownerProfile.company_name || ownerProfile.full_name
      : ownerProfile.full_name;

    return {
      landlordName,
      senderName: landlordName,
      hostName: landlordName,
      ownerName: landlordName,
      landlordAddress: ownerAddress,
      senderAddress: ownerAddress,
      landlordEmail: ownerProfile.email || "",
      landlordPhone: ownerProfile.phone || "",
      landlordTaxId: ownerProfile.tax_id || "",
      taxId: ownerProfile.tax_id || "",
      landlordNIF: ownerProfile.tax_id || "",
      landlordDNI: ownerProfile.tax_id || "",
      landlordAfm: ownerProfile.tax_id || "",
      landlordSiret: ownerProfile.tax_id || "",
      landlordTIN: ownerProfile.tax_id || "",
      landlordBankName: ownerProfile.bank_name || "",
      bankName: ownerProfile.bank_name || "",
      landlordBankIban: ownerProfile.bank_iban || "",
      bankIban: ownerProfile.bank_iban || "",
      landlordBankBic: ownerProfile.bank_bic || "",
      bankBic: ownerProfile.bank_bic || "",
      landlordPersonType: ownerProfile.person_type,
      landlordCompanyName: ownerProfile.company_name || "",
      companyName: ownerProfile.company_name || "",
    };
  }, [ownerProfile]);

  /** Get inventory reports for a property/tenant */
  const getInventoryForProperty = useCallback((propertyId: string, tenantId?: string) => {
    return inventoryReports.filter(r =>
      r.property_id === propertyId && (!tenantId || r.tenant_id === tenantId)
    );
  }, [inventoryReports]);

  /** Get tenants for a specific property */
  const getTenantsForProperty = useCallback((propertyId: string) => {
    return tenants.filter(t => t.property_id === propertyId);
  }, [tenants]);

  return {
    fillFromTenant,
    fillFromProperty,
    fillFromOwner,
    getTenantsForProperty,
    getInventoryForProperty,
    ownerProfile,
    inventoryReports,
  };
}
