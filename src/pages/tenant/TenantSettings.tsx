import { useState } from "react";
import { Loader2, Save, PenTool, User, MapPin, Briefcase } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import SignaturePad from "@/components/ui/SignaturePad";
import { useTenantProperty } from "@/hooks/useTenantProperty";
import { useGlobalProfile } from "@/hooks/useGlobalProfile";
import { useI18n } from "@/lib/i18n";
import { getProfileLabels } from "@/lib/i18n-validation";
import { getCountryEntryOrDefault, getAllCountryEntries } from "@/lib/global-country-registry";

const TenantSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { T, L } = useTenantProperty();
  const { locale } = useI18n();
  const PL = getProfileLabels(locale);
  const { profile, loading, saving, saveProfile } = useGlobalProfile();

  const [form, setForm] = useState<Record<string, string>>({});

  // Initialize form from profile on first load
  const getVal = (key: string) => form[key] ?? (profile as any)[key] ?? "";
  const setVal = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    const success = await saveProfile({
      firstName: getVal("firstName"),
      lastName: getVal("lastName"),
      fullName: [getVal("firstName"), getVal("lastName")].filter(Boolean).join(" ") || getVal("fullName"),
      phone: getVal("phone"),
      dateOfBirth: getVal("dateOfBirth"),
      nationality: getVal("nationality"),
      idNumber: getVal("idNumber"),
      address: getVal("address"),
      city: getVal("city"),
      postalCode: getVal("postalCode"),
      country: getVal("country") || profile.country,
      companyName: getVal("companyName"),
      taxId: getVal("taxId"),
      signatureUrl: getVal("signatureUrl") || profile.signatureUrl,
    });
    toast({
      title: success ? PL.profileUpdated : PL.profileError,
      variant: success ? "default" : "destructive",
    });
  };

  const cc = getCountryEntryOrDefault(getVal("country") || profile.country);

  return (
    <TenantLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">{PL.myProfile}</h1>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-6">
            {/* Identity */}
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">{PL.identitySection}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{PL.firstName}</label>
                  <input type="text" value={getVal("firstName")} onChange={e => setVal("firstName", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{PL.lastName}</label>
                  <input type="text" value={getVal("lastName")} onChange={e => setVal("lastName", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{PL.email}</label>
                <input type="email" value={user?.email || ""} disabled className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-muted-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{PL.phone}</label>
                <input type="tel" value={getVal("phone")} onChange={e => setVal("phone", e.target.value)} placeholder={cc.phoneFormat} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{PL.dateOfBirth}</label>
                <input type="date" value={getVal("dateOfBirth")} onChange={e => setVal("dateOfBirth", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{PL.nationality}</label>
                <select value={getVal("nationality")} onChange={e => setVal("nationality", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">{PL.nationality}</option>
                  {getAllCountryEntries().map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{PL.idNumber}</label>
                <input type="text" value={getVal("idNumber")} onChange={e => setVal("idNumber", e.target.value)} placeholder={cc.taxIdLabel} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            {/* Address */}
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">{PL.addressSection}</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{PL.address}</label>
                <input type="text" value={getVal("address")} onChange={e => setVal("address", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{PL.postalCode}</label>
                  <input type="text" value={getVal("postalCode")} onChange={e => setVal("postalCode", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{PL.city}</label>
                  <input type="text" value={getVal("city")} onChange={e => setVal("city", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{PL.country}</label>
                <select value={getVal("country") || profile.country} onChange={e => setVal("country", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {getAllCountryEntries().map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Business (optional) */}
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">{PL.businessSection}</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{PL.companyName}</label>
                <input type="text" value={getVal("companyName")} onChange={e => setVal("companyName", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{PL.taxId}</label>
                <input type="text" value={getVal("taxId")} onChange={e => setVal("taxId", e.target.value)} placeholder={cc.taxIdLabel} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            {/* Signature */}
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <PenTool className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">{PL.signature}</h2>
              </div>
              <SignaturePad label={PL.signature} value={getVal("signatureUrl") || profile.signatureUrl} onChange={v => setVal("signatureUrl", v)} />
            </div>

            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? PL.saving : PL.save}
            </button>
          </div>
        )}
      </div>
    </TenantLayout>
  );
};

export default TenantSettings;
