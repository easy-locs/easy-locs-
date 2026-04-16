import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { realEstatePropertyService } from "@/services/real-estate.service";
import { PROPERTY_TAXONOMY, LISTING_TYPES } from "@/domains/real-estate/taxonomy";
import { getCountryRules, getSupportedCountries } from "@/domains/real-estate/country-rules";
import { getPublishBlockers } from "@/domains/real-estate/quality-gates";
import type { Property, PropertyType, ListingType, PropertyCategory, FurnishingStatus } from "@/domains/real-estate/canonical-types";
import { ArrowLeft, Check, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { startWorkflow } from "@/lib/workflows/workflow-engine";
import { PROPERTY_WORKFLOWS } from "@/lib/workflows/property-workflows";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const navy = "hsl(226 24% 14%)";
const gold = "hsl(var(--accent))";

type Step = "basics" | "location" | "details" | "media" | "review";

const STEPS: { key: Step; labelKey: string }[] = [
  { key: "basics", labelKey: "re.step.basics" },
  { key: "location", labelKey: "re.step.location" },
  { key: "details", labelKey: "re.step.details" },
  { key: "media", labelKey: "re.step.media" },
  { key: "review", labelKey: "re.step.review" },
];

export default function MePropertyCreatePage() {
  useUiEngine("me-mepropertycreatepage");
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>("basics");
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listingType, setListingType] = useState<ListingType>("rent");
  const [propertyCategory, setPropertyCategory] = useState<PropertyCategory>("residential");
  const [propertyType, setPropertyType] = useState<PropertyType>("apartment");
  const [price, setPrice] = useState("");
  const [country, setCountry] = useState("AE");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [area, setArea] = useState("");
  const [furnishing, setFurnishing] = useState<FurnishingStatus>("unfurnished");

  const countryRules = getCountryRules(country);
  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);
  const categoryTypes = PROPERTY_TAXONOMY.find(c => c.key === propertyCategory)?.children ?? [];

  const buildProperty = (): Omit<Property, "id" | "createdAt" | "updatedAt"> => ({
    userId: user?.id ?? "",
    propertyType,
    propertyCategory,
    listingType,
    managementType: "direct_owner",
    title,
    description: description || undefined,
    address: {
      line1: address,
      city,
      district: district || undefined,
      country,
    },
    price: Number(price) || 0,
    currency: countryRules.currency,
    bedrooms: bedrooms ? Number(bedrooms) : undefined,
    bathrooms: bathrooms ? Number(bathrooms) : undefined,
    area: area ? Number(area) : undefined,
    areaUnit: countryRules.areaUnit,
    furnishingStatus: furnishing,
    status: "draft",
    verificationStatus: "unverified",
    mediaIds: [],
    amenities: [],
  });

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const prop = buildProperty();

      if (isPlatformFlagEnabled("enable_property_workflows")) {
        const wf = await startWorkflow(PROPERTY_WORKFLOWS.createProperty, {
          userId: user?.id ?? "",
          propertyData: prop,
        });
        toast.success(t("re.create.success", "Property created"));
        navigate(wf.context.propertyId ? `/me/properties/${wf.context.propertyId}` : "/me/properties/list");
      } else {
        const created = await realEstatePropertyService.create(prop);
        toast.success(t("re.create.success", "Property created"));
        navigate(created ? `/me/properties/${created.id}` : "/me/properties/list");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("re.create.error", "Failed to create property"));
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    const idx = currentStepIndex;
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1].key);
  };

  const goBack = () => {
    const idx = currentStepIndex;
    if (idx > 0) setCurrentStep(STEPS[idx - 1].key);
    else navigate(-1);
  };

  return (
    <SubPageShell className="bg-background">
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ background: navy }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={goBack} className="p-1.5 rounded-full bg-white/10">
            <ArrowLeft size={20} color="#fff" />
          </button>
          <h1 className="text-base font-bold text-white">{t("re.create.title", "Add Property")}</h1>
        </div>

        <div className="flex gap-1.5">
          {STEPS.map((step, i) => (
            <div
              key={step.key}
              className="flex-1 h-1 rounded-full"
              style={{ background: i <= currentStepIndex ? gold : "rgba(255,255,255,0.15)" }}
            />
          ))}
        </div>
        <p className="text-xs text-white/50 mt-1.5">
          {t(STEPS[currentStepIndex].labelKey, STEPS[currentStepIndex].key)} ({currentStepIndex + 1}/{STEPS.length})
        </p>
      </div>

      <div className="px-4 py-4">
        {currentStep === "basics" && (
          <div className="space-y-4">
            <FormField label={t("re.field.title", "Property Title")}>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t("re.field.title_placeholder", "e.g., Modern 2BR Apartment")} className="w-full p-3 rounded-xl border text-sm outline-none" style={{ borderColor: "#e0e0e0", fontSize: "1rem" }} />
            </FormField>
            <FormField label={t("re.field.listing_type", "Listing Type")}>
              <div className="flex gap-2 flex-wrap">
                {LISTING_TYPES.map(lt => (
                  <button key={lt.key} onClick={() => setListingType(lt.key)} className="px-4 py-2 rounded-xl text-xs font-medium" style={{ background: listingType === lt.key ? navy : "#f0f0f0", color: listingType === lt.key ? "#fff" : "#666" }}>
                    {lt.icon} {t(lt.labelKey, lt.key)}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label={t("re.field.category", "Category")}>
              <div className="flex gap-2 flex-wrap">
                {PROPERTY_TAXONOMY.map(cat => (
                  <button key={cat.key} onClick={() => { setPropertyCategory(cat.key as PropertyCategory); setPropertyType((cat.children?.[0]?.key ?? "apartment") as PropertyType); }} className="px-4 py-2 rounded-xl text-xs font-medium" style={{ background: propertyCategory === cat.key ? navy : "#f0f0f0", color: propertyCategory === cat.key ? "#fff" : "#666" }}>
                    {cat.icon} {t(cat.labelKey, cat.key)}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label={t("re.field.type", "Property Type")}>
              <div className="flex gap-2 flex-wrap">
                {categoryTypes.map(pt => (
                  <button key={pt.key} onClick={() => setPropertyType(pt.key as PropertyType)} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: propertyType === pt.key ? gold : "#f0f0f0", color: propertyType === pt.key ? navy : "#666" }}>
                    {t(pt.labelKey, pt.key.replace(/_/g, " "))}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label={`${t("re.field.price", "Price")} (${countryRules.currency})`}>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className="w-full p-3 rounded-xl border text-sm outline-none" style={{ borderColor: "#e0e0e0", fontSize: "1rem" }} />
            </FormField>
          </div>
        )}

        {currentStep === "location" && (
          <div className="space-y-4">
            <FormField label={t("re.field.country", "Country")}>
              <select value={country} onChange={e => setCountry(e.target.value)} className="w-full p-3 rounded-xl border text-sm outline-none" style={{ borderColor: "#e0e0e0", fontSize: "1rem" }}>
                {getSupportedCountries().map(c => (
                  <option key={c} value={c}>{getCountryRules(c).countryName}</option>
                ))}
                <option value="OTHER">{t("re.field.other_country", "Other")}</option>
              </select>
            </FormField>
            <FormField label={t("re.field.city", "City")}>
              <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder={t("re.field.city_placeholder", "e.g., Dubai")} className="w-full p-3 rounded-xl border text-sm outline-none" style={{ borderColor: "#e0e0e0", fontSize: "1rem" }} />
            </FormField>
            <FormField label={t("re.field.district", "District / Area")}>
              <input type="text" value={district} onChange={e => setDistrict(e.target.value)} placeholder={countryRules.localLabels?.district ?? "District"} className="w-full p-3 rounded-xl border text-sm outline-none" style={{ borderColor: "#e0e0e0", fontSize: "1rem" }} />
            </FormField>
            <FormField label={t("re.field.address", "Address")}>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder={t("re.field.address_placeholder", "Full address")} className="w-full p-3 rounded-xl border text-sm outline-none" style={{ borderColor: "#e0e0e0", fontSize: "1rem" }} />
            </FormField>
          </div>
        )}

        {currentStep === "details" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t("re.field.bedrooms", "Bedrooms")}>
                <input type="number" value={bedrooms} onChange={e => setBedrooms(e.target.value)} placeholder="0" className="w-full p-3 rounded-xl border text-sm outline-none" style={{ borderColor: "#e0e0e0", fontSize: "1rem" }} />
              </FormField>
              <FormField label={t("re.field.bathrooms", "Bathrooms")}>
                <input type="number" value={bathrooms} onChange={e => setBathrooms(e.target.value)} placeholder="0" className="w-full p-3 rounded-xl border text-sm outline-none" style={{ borderColor: "#e0e0e0", fontSize: "1rem" }} />
              </FormField>
            </div>
            <FormField label={`${t("re.field.area", "Area")} (${countryRules.areaUnit})`}>
              <input type="number" value={area} onChange={e => setArea(e.target.value)} placeholder="0" className="w-full p-3 rounded-xl border text-sm outline-none" style={{ borderColor: "#e0e0e0", fontSize: "1rem" }} />
            </FormField>
            <FormField label={t("re.field.furnishing", "Furnishing")}>
              <div className="flex gap-2">
                {(["unfurnished", "semi_furnished", "furnished"] as FurnishingStatus[]).map(f => (
                  <button key={f} onClick={() => setFurnishing(f)} className="flex-1 py-2 rounded-xl text-xs font-medium capitalize" style={{ background: furnishing === f ? navy : "#f0f0f0", color: furnishing === f ? "#fff" : "#666" }}>
                    {t(`re.furnishing.${f}`, f.replace(/_/g, " "))}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label={t("re.field.description", "Description")}>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder={t("re.field.desc_placeholder", "Describe your property...")} className="w-full p-3 rounded-xl border text-sm outline-none resize-none" style={{ borderColor: "#e0e0e0", fontSize: "1rem" }} />
            </FormField>
          </div>
        )}

        {currentStep === "media" && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "#f0f0f0" }}>
              <span className="text-3xl">📷</span>
            </div>
            <p className="text-sm font-medium" style={{ color: navy }}>{t("re.create.add_photos", "Add Photos")}</p>
            <p className="text-xs mt-1" style={{ color: "#999" }}>{t("re.create.photos_hint", "Minimum 3 photos recommended for publishing")}</p>
            <button className="mt-4 px-6 py-2.5 rounded-xl text-sm font-medium" style={{ background: "#f0f0f0", color: navy }}>
              {t("re.create.upload", "Upload Photos")}
            </button>
          </div>
        )}

        {currentStep === "review" && (
          <div className="space-y-3">
            <div className="rounded-xl p-4 bg-card">
              <h3 className="text-sm font-bold mb-3" style={{ color: navy }}>{t("re.create.summary", "Summary")}</h3>
              <div className="space-y-2">
                <ReviewRow label={t("re.field.title", "Title")} value={title || "—"} />
                <ReviewRow label={t("re.field.type", "Type")} value={`${propertyCategory} / ${propertyType.replace(/_/g, " ")}`} />
                <ReviewRow label={t("re.field.listing_type", "Listing")} value={listingType.replace(/_/g, " ")} />
                <ReviewRow label={t("re.field.price", "Price")} value={price ? `${Number(price).toLocaleString()} ${countryRules.currency}` : "—"} />
                <ReviewRow label={t("re.field.location", "Location")} value={[city, country].filter(Boolean).join(", ") || "—"} />
                <ReviewRow label={t("re.field.bedrooms", "Bedrooms")} value={bedrooms || "—"} />
                <ReviewRow label={t("re.field.area", "Area")} value={area ? `${area} ${countryRules.areaUnit}` : "—"} />
              </div>
            </div>

            {(() => {
              const blockers = getPublishBlockers(buildProperty() as Property);
              if (blockers.length === 0) return null;
              return (
                <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "#fef3c7" }}>
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: "#f59e0b" }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: "#92400e" }}>{t("re.create.publish_blockers", "Cannot publish yet:")}</p>
                    <ul className="text-xs mt-1 space-y-0.5" style={{ color: "#a16207" }}>
                      {blockers.map(b => <li key={b}>• {t(b, b)}</li>)}
                    </ul>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border">
        <div className="flex gap-3 max-w-lg mx-auto">
          {currentStepIndex > 0 && (
            <button onClick={goBack} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ background: "#f0f0f0", color: navy }}>
              {t("common.back", "Back")}
            </button>
          )}
          {currentStep === "review" ? (
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: gold, color: navy, opacity: saving ? 0.6 : 1 }}>
              <Check size={16} /> {saving ? t("common.saving", "Saving...") : t("re.create.save_draft", "Save as Draft")}
            </button>
          ) : (
            <button onClick={goNext} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ background: gold, color: navy }}>
              {t("common.next", "Next")} →
            </button>
          )}
        </div>
      </div>
    </SubPageShell>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "hsl(226 24% 14%)" }}>{label}</label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "#f0f0f0" }}>
      <span className="text-xs" style={{ color: "#999" }}>{label}</span>
      <span className="text-xs font-medium capitalize" style={{ color: "hsl(226 24% 14%)" }}>{value}</span>
    </div>
  );
}
