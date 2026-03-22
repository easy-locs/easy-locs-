/**
 * SmartClientForm — Intelligent tenant/client creation form.
 * Auto-fills fields based on detected country and address selection.
 * Uses AddressAutocomplete for instant address completion.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CountrySelect from "@/components/ui/CountrySelect";
import AddressAutocomplete, { type AddressResult } from "@/components/ui/AddressAutocomplete";
import { useGeoDetect } from "@/hooks/useGeoDetect";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import { getCountryConfig } from "@/lib/country-config";
import { UserPlus, MapPin, Globe, Zap } from "lucide-react";

export interface SmartClientData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  nationality: string;
  birthDate: string;
  birthPlace: string;
  profession: string;
  idNumber: string;
  leaseType: string;
  lat?: number;
  lng?: number;
}

interface SmartClientFormProps {
  /** Pre-fill with existing data */
  initialData?: Partial<SmartClientData>;
  /** Country of the property (overrides geo-detection for address) */
  propertyCountry?: string;
  /** Called when form is submitted */
  onSubmit: (data: SmartClientData) => void;
  /** Called when form is cancelled */
  onCancel?: () => void;
  loading?: boolean;
}

const EMPTY: SmartClientData = {
  name: "", email: "", phone: "", address: "", city: "",
  postalCode: "", country: "", nationality: "", birthDate: "",
  birthPlace: "", profession: "", idNumber: "", leaseType: "furnished",
};

export default function SmartClientForm({
  initialData,
  propertyCountry,
  onSubmit,
  onCancel,
  loading,
}: SmartClientFormProps) {
  const { detection } = useGeoDetect();
  const detectedCountry = detection?.country;

  const effectiveCountry = propertyCountry || initialData?.country || detectedCountry || "FR";

  const [form, setForm] = useState<SmartClientData>(() => ({
    ...EMPTY,
    country: effectiveCountry,
    nationality: effectiveCountry,
    ...initialData,
  }));

  const countryEntry = useMemo(() => getCountryEntryOrDefault(form.country), [form.country]);
  const cc = useMemo(() => getCountryConfig(form.country), [form.country]);

  // Update defaults when country changes
  useEffect(() => {
    if (!initialData?.country && effectiveCountry && form.country !== effectiveCountry) {
      setForm(prev => ({ ...prev, country: effectiveCountry, nationality: prev.nationality || effectiveCountry }));
    }
  }, [effectiveCountry]);

  const updateField = useCallback(<K extends keyof SmartClientData>(key: K, value: SmartClientData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleAddressSelect = useCallback((result: AddressResult) => {
    setForm(prev => ({
      ...prev,
      address: [result.housenumber, result.street].filter(Boolean).join(" ") || result.label,
      city: result.city || prev.city,
      postalCode: result.postcode || prev.postalCode,
      country: result.countryCode || prev.country,
      lat: result.lat,
      lng: result.lng,
    }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const phonePrefix = countryEntry.phonePrefix || "";

  return (
    <form onSubmit={handleSubmit} className="space-y-[var(--section-gap)]">
      {/* Auto-detection indicator */}
      <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-[var(--card-radius)] text-xs text-muted-foreground">
        <Zap className="h-3.5 w-3.5 text-primary" />
        <span>Smart auto-fill active — country: <strong>{countryEntry.flag} {countryEntry.name}</strong></span>
      </div>

      {/* Identity Section */}
      <fieldset className="space-y-[var(--field-gap)]">
        <legend className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
          <UserPlus className="h-4 w-4" /> Identity
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--field-gap)]">
          <div className="space-y-[var(--label-gap)]">
            <Label>Full Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>
          <div className="space-y-[var(--label-gap)]">
            <Label>Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="john@example.com"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--field-gap)]">
          <div className="space-y-[var(--label-gap)]">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder={phonePrefix ? `${phonePrefix} ...` : "+1 ..."}
            />
          </div>
          <div className="space-y-[var(--label-gap)]">
            <Label>Profession</Label>
            <Input
              value={form.profession}
              onChange={(e) => updateField("profession", e.target.value)}
              placeholder="Software Engineer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--field-gap)]">
          <div className="space-y-[var(--label-gap)]">
            <Label>Date of Birth</Label>
            <Input
              type="date"
              value={form.birthDate}
              onChange={(e) => updateField("birthDate", e.target.value)}
            />
          </div>
          <div className="space-y-[var(--label-gap)]">
            <Label>Place of Birth</Label>
            <Input
              value={form.birthPlace}
              onChange={(e) => updateField("birthPlace", e.target.value)}
              placeholder="Paris"
            />
          </div>
          <div className="space-y-[var(--label-gap)]">
            <Label>ID Number</Label>
            <Input
              value={form.idNumber}
              onChange={(e) => updateField("idNumber", e.target.value)}
              placeholder="ID Number"
            />
          </div>
        </div>
      </fieldset>

      {/* Address Section */}
      <fieldset className="space-y-[var(--field-gap)]">
        <legend className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4" /> Address
        </legend>

        <AddressAutocomplete
          value={form.address}
          onChange={(val) => updateField("address", val)}
          onSelect={handleAddressSelect}
          countryCode={form.country}
          label="Street Address"
          placeholder="Start typing to auto-fill..."
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-[var(--field-gap)]">
          <div className="space-y-[var(--label-gap)]">
            <Label>Postal Code</Label>
            <Input
              value={form.postalCode}
              onChange={(e) => updateField("postalCode", e.target.value)}
              placeholder="75001"
            />
          </div>
          <div className="space-y-[var(--label-gap)]">
            <Label>City</Label>
            <Input
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="Paris"
            />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-[var(--label-gap)]">
            <Label>Country</Label>
            <CountrySelect
              value={form.country}
              onChange={(val) => updateField("country", val)}
            />
          </div>
        </div>
      </fieldset>

      {/* Nationality & Lease */}
      <fieldset className="space-y-[var(--field-gap)]">
        <legend className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4" /> Additional Info
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--field-gap)]">
          <div className="space-y-[var(--label-gap)]">
            <Label>Nationality</Label>
            <CountrySelect
              value={form.nationality}
              onChange={(val) => updateField("nationality", val)}
            />
          </div>
          <div className="space-y-[var(--label-gap)]">
            <Label>Lease Type</Label>
            <Select value={form.leaseType} onValueChange={(val) => updateField("leaseType", val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="furnished">Furnished</SelectItem>
                <SelectItem value="unfurnished">Unfurnished</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="seasonal">Seasonal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </fieldset>

      {/* GPS coordinates (read-only, auto-filled) */}
      {(form.lat || form.lng) && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
          <MapPin className="h-3 w-3" />
          GPS: {form.lat?.toFixed(5)}, {form.lng?.toFixed(5)}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading || !form.name.trim()} className="flex-1 sm:flex-none">
          {loading ? "Saving..." : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
