import { useCallback } from "react";
import type { Property, Tenant } from "@/hooks/useRentalData";

/**
 * Hook for auto-filling form data from tenant/property selection.
 * When a tenant is selected, all related fields (name, email, phone, property, rent, etc.) are filled.
 * When a property is selected, address and financial fields are filled.
 */
export function useAutoFill(properties: Property[], tenants: Tenant[]) {
  /** Auto-fill from tenant selection → fills name, contact, property, financials */
  const fillFromTenant = useCallback((tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return null;

    const property = tenant.property_id ? properties.find(p => p.id === tenant.property_id) : null;

    return {
      // Tenant identity
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      tenantPhone: tenant.phone,
      tenantBirthDate: tenant.birth_date || "",
      tenantBirthPlace: tenant.birth_place || "",
      tenantNationality: tenant.nationality || "",
      tenantProfession: tenant.profession || "",
      // Guarantor
      guarantorName: tenant.guarantor_name || "",
      guarantorPhone: tenant.guarantor_phone || "",
      // Lease
      leaseStart: tenant.lease_start || "",
      leaseEnd: tenant.lease_end || "",
      leaseType: tenant.lease_type,
      // Financials
      rentAmount: tenant.rent_amount,
      chargesAmount: tenant.charges_amount,
      depositAmount: tenant.deposit_amount,
      // Property (if linked)
      propertyId: tenant.property_id,
      ...(property ? {
        propertyLabel: property.label,
        propertyAddress: property.address,
        propertyPostalCode: property.postal_code,
        propertyCity: property.city,
        propertyType: property.property_type,
        propertySurface: property.surface,
        propertyRooms: property.rooms,
        propertyFloor: property.floor,
        propertyHeating: property.heating,
        propertyFurnished: property.furnished,
        propertyBuildingName: property.building_name || "",
        propertyLotNumber: property.lot_number || "",
        fullAddress: `${property.address}, ${property.postal_code} ${property.city}`,
      } : {}),
    };
  }, [properties, tenants]);

  /** Auto-fill from property selection → fills address + financial defaults */
  const fillFromProperty = useCallback((propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return null;

    return {
      propertyId: property.id,
      propertyLabel: property.label,
      propertyAddress: property.address,
      propertyPostalCode: property.postal_code,
      propertyCity: property.city,
      propertyType: property.property_type,
      propertySurface: property.surface,
      propertyRooms: property.rooms,
      propertyFloor: property.floor,
      propertyHeating: property.heating,
      propertyFurnished: property.furnished,
      propertyBuildingName: property.building_name || "",
      propertyLotNumber: property.lot_number || "",
      fullAddress: `${property.address}, ${property.postal_code} ${property.city}`,
      rentAmount: property.monthly_rent,
      chargesAmount: property.monthly_charges,
      depositAmount: property.deposit_amount,
    };
  }, [properties]);

  /** Get tenants for a specific property */
  const getTenantsForProperty = useCallback((propertyId: string) => {
    return tenants.filter(t => t.property_id === propertyId);
  }, [tenants]);

  return { fillFromTenant, fillFromProperty, getTenantsForProperty };
}
