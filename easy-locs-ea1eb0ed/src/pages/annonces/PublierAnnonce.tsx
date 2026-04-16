import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Camera, MapPin, X, Info, Sparkles, Eye, ChevronDown, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useC2CDraftStore } from "@/lib/c2c/c2c-draft-store";
import { C2C_CATEGORY_TREE, C2C_CONDITIONS, C2C_PRICE_TYPES, C2C_DELIVERY_OPTIONS, getAttributeSchema, PROHIBITED_KEYWORDS } from "@/lib/c2c/c2c-category-tree";
import type { C2CAttributeField } from "@/lib/c2c/c2c-category-tree";
import { c2cService } from "@/services/domain/c2c.service";
import { useAuth } from "@/contexts/AuthContext";
import SubPageShell from "@/components/layout/SubPageShell";
import SEOHead from "@/components/SEOHead";
import { tc } from "@/lib/i18n-canonical";
import { useI18n } from "@/lib/i18n";
import { useLocationStore } from "@/stores/locationStore";

const STEP_KEYS = [
  { labelKey: "page.annonces.publish.step_category", emoji: "📁" },
  { labelKey: "page.annonces.publish.step_title", emoji: "✏️" },
  { labelKey: "page.annonces.publish.step_attributes", emoji: "📋" },
  { labelKey: "page.annonces.publish.step_condition", emoji: "✨" },
  { labelKey: "page.annonces.publish.step_photos", emoji: "📸" },
  { labelKey: "page.annonces.publish.step_price", emoji: "💰" },
  { labelKey: "page.annonces.publish.step_location", emoji: "📍" },
  { labelKey: "page.annonces.publish.step_delivery", emoji: "🚚" },
  { labelKey: "page.annonces.publish.step_preview", emoji: "👀" },
];

function generateSlug(title: string, subcategory: string): string {
  const text = `${subcategory} ${title}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${text}-${Date.now().toString(36)}`;
}

function checkProhibited(text: string): string | null {
  const lower = text.toLowerCase();
  for (const kw of PROHIBITED_KEYWORDS) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

type AttributeValue = string | number | boolean | string[] | null;
function AttributeField({ field, value, onChange }: { field: C2CAttributeField; value: AttributeValue; onChange: (v: AttributeValue) => void }) {
  switch (field.type) {
    case "text":
      return (
        <div>
          <label className="text-sm font-semibold">{field.label}{field.required && <span className="text-red-500"> *</span>}</label>
          <Input value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} className="mt-1.5 h-11" />
        </div>
      );
    case "number":
      return (
        <div>
          <label className="text-sm font-semibold">{field.label}{field.required && <span className="text-red-500"> *</span>} {field.unit && <span className="text-muted-foreground font-normal">({field.unit})</span>}</label>
          <Input type="number" value={value || ""} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)} min={field.min} max={field.max} className="mt-1.5 h-11" />
        </div>
      );
    case "select":
      return (
        <div>
          <label className="text-sm font-semibold">{field.label}{field.required && <span className="text-red-500"> *</span>}</label>
          <div className="relative mt-1.5">
            <select value={value || ""} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm appearance-none pr-8 h-11">
              <option value="">{t("page.annonces.publish.select_placeholder")}</option>
              {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      );
    case "boolean":
      return (
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors">
          <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} className="rounded h-4 w-4" />
          <span className="text-sm font-medium">{field.label}</span>
        </label>
      );
    case "multi-select":
      return (
        <div>
          <label className="text-sm font-semibold">{field.label}</label>
          <div className="flex gap-2 flex-wrap mt-1.5">
            {field.options?.map(o => (
              <button
                key={o}
                type="button"
                onClick={() => {
                  const arr = Array.isArray(value) ? value : [];
                  onChange(arr.includes(o) ? arr.filter((v: string) => v !== o) : [...arr, o]);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
                  Array.isArray(value) && value.includes(o)
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-muted/60 text-muted-foreground border border-border/30"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default function PublierAnnonce() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft, setField, setAttribute, setStep, reset } = useC2CDraftStore();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const step = draft.step;
  const attributes = getAttributeSchema(draft.category, draft.subcategory);

  const canNext = useCallback(() => {
    switch (step) {
      case 0: return !!draft.category && !!draft.subcategory;
      case 1: return draft.title.length >= 5 && draft.description.length >= 10;
      case 2: return true;
      case 3: return !!draft.condition;
      case 4: return draft.photoUrls.length >= 3;
      case 5: return draft.priceType === "free" || draft.priceType === "on_demand" || draft.priceType === "exchange" || (draft.price != null && draft.price > 0);
      case 6: return !!draft.city;
      case 7: return !!draft.deliveryOption;
      case 8: return true;
      default: return false;
    }
  }, [step, draft]);

  const nextStep = () => { if (canNext()) setStep(Math.min(step + 1, 8)); };
  const prevStep = () => { if (step > 0) setStep(step - 1); };

  const handlePublish = async (asDraft = false) => {
    if (!user) return;

    const prohibited = checkProhibited(draft.title + " " + draft.description);
    if (prohibited) {
      setError(`${t("page.annonces.publish.prohibited")}: "${prohibited}".`);
      return;
    }

    setPublishing(true);
    setError("");
    try {
      const slug = generateSlug(draft.title, draft.subcategory);
      await c2cService.createListing({
        title: draft.title,
        description: draft.description,
        price: draft.priceType === "free" ? 0 : (draft.price ?? 0),
        currency: draft.currency,
        category: draft.category,
        subcategory: draft.subcategory,
        custom_attributes: draft.customAttributes,
        price_type: draft.priceType,
        delivery_option: draft.deliveryOption,
        condition: draft.condition,
        city: draft.city,
        quartier: draft.quartier,
        country: draft.country || "FR",
        lat: draft.lat,
        lng: draft.lng,
        slug,
        photo_urls: draft.photoUrls,
        status: asDraft ? "draft" : "published",
        active: !asDraft,
        user_id: user.id,
        listing_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      } as Partial<import("@/repositories/domain/c2c.repo").C2CListingRow>);

      reset();
      toast.success(asDraft ? t("page.annonces.publish.draft_saved") : t("page.annonces.publish.published_success"));
      navigate(asDraft ? "/annonces/mes-annonces" : "/annonces");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("page.annonces.publish.publish_error"));
    } finally {
      setPublishing(false);
    }
  };

  const compressImage = (file: File, maxDim = 1200, quality = 0.8): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remaining = 10 - draft.photoUrls.length;
    const toUpload = files.slice(0, remaining);
    const compressed: string[] = [];

    for (const file of toUpload) {
      try {
        const dataUrl = await compressImage(file);
        compressed.push(dataUrl);
      } catch {
        const reader = new FileReader();
        const fallback = await new Promise<string>((res) => {
          reader.onload = () => res(reader.result as string);
          reader.readAsDataURL(file);
        });
        compressed.push(fallback);
      }
    }
    setField("photoUrls", [...draft.photoUrls, ...compressed]);
    toast.success(t("page.annonces.publish.photos_added").replace("{{count}}", String(compressed.length)), { duration: 1500 });
  };

  const removePhoto = (idx: number) => {
    setField("photoUrls", draft.photoUrls.filter((_, i) => i !== idx));
  };

  const titleQuality = draft.title.length < 5 ? "poor" : draft.title.length < 20 ? "ok" : draft.title.length < 60 ? "good" : "excellent";
  const descQuality = draft.description.length < 10 ? "poor" : draft.description.length < 50 ? "ok" : draft.description.length < 200 ? "good" : "excellent";
  const qualityColors = { poor: "bg-red-500", ok: "bg-amber-500", good: "bg-emerald-500", excellent: "bg-emerald-600" };

  const selectedCategory = C2C_CATEGORY_TREE.find(c => c.key === draft.category);

  return (
    <SubPageShell>
      <SEOHead title={`${tc("c2c.publish")} — Easy-Locs`} noindex />
      <div className="max-w-lg mx-auto pb-28">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted active:scale-95 transition-transform"><ArrowLeft className="h-4 w-4" /></button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold">{tc("c2c.publish")}</h1>
            <p className="text-xs text-muted-foreground">{STEP_KEYS[step].emoji} {t(STEP_KEYS[step].labelKey)}</p>
          </div>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{step + 1}/{STEP_KEYS.length}</span>
        </div>

        <div className="flex gap-0.5 mb-6">
          {STEP_KEYS.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted/60">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.3 }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 min-h-[300px]"
          >
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-base font-bold">{t("page.annonces.publish.choose_category")}</h2>
                <div className="grid grid-cols-2 gap-2">
                  {C2C_CATEGORY_TREE.map(cat => (
                    <motion.button
                      key={cat.key}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setField("category", cat.key); setField("subcategory", ""); }}
                      className={`p-3.5 rounded-xl border text-left transition-all ${draft.category === cat.key ? "border-primary bg-primary/5 shadow-md shadow-primary/10" : "border-border/50 hover:bg-muted/50"}`}
                    >
                      <span className="text-2xl">{cat.emoji}</span>
                      <p className="text-sm font-semibold mt-1.5">{cat.label}</p>
                      <p className="text-[0.625rem] text-muted-foreground">{cat.subcategories.length} sous-cat.</p>
                    </motion.button>
                  ))}
                </div>
                {selectedCategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2 overflow-hidden"
                  >
                    <h3 className="text-sm font-bold">{t("page.annonces.publish.subcategory")}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedCategory.subcategories.map(sub => (
                        <button
                          key={sub.value}
                          onClick={() => setField("subcategory", sub.value)}
                          className={`p-2.5 rounded-xl border text-left text-sm transition-all active:scale-[0.98] ${draft.subcategory === sub.value ? "border-primary bg-primary/5 font-semibold shadow-sm" : "border-border/50 hover:bg-muted/50"}`}
                        >
                          <span>{sub.emoji}</span> {sub.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold">{t("page.annonces.publish.title_label")} <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${qualityColors[titleQuality]}`} />
                      <span className="text-[0.625rem] text-muted-foreground">{draft.title.length}/100</span>
                    </div>
                  </div>
                  <Input value={draft.title} onChange={e => setField("title", e.target.value)} placeholder="Ex: iPhone 15 Pro 256Go Noir" maxLength={100} className="h-11" />
                  <p className="text-[0.625rem] text-muted-foreground mt-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    {t("page.annonces.publish.title_hint")}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold">{t("page.annonces.publish.description_label")} <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${qualityColors[descQuality]}`} />
                      <span className="text-[0.625rem] text-muted-foreground">{draft.description.length}/5000</span>
                    </div>
                  </div>
                  <textarea
                    value={draft.description}
                    onChange={e => setField("description", e.target.value)}
                    placeholder={t("page.annonces.publish.description_placeholder")}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm min-h-[140px] resize-y focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    maxLength={5000}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-base font-bold">{t("page.annonces.publish.attributes")}</h2>
                {attributes.length > 0 ? (
                  attributes.map(field => (
                    <AttributeField
                      key={field.key}
                      field={field}
                      value={draft.customAttributes[field.key]}
                      onChange={v => setAttribute(field.key, v)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t("page.annonces.publish.no_attributes")}</p>
                    <p className="text-xs mt-1">{t("page.annonces.publish.next_step")}</p>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-base font-bold">{t("page.annonces.publish.item_condition")}</h2>
                <div className="space-y-2">
                  {C2C_CONDITIONS.map(c => (
                    <motion.button
                      key={c.value}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setField("condition", c.value)}
                      className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${draft.condition === c.value ? "border-primary bg-primary/5 shadow-md shadow-primary/10" : "border-border/50 hover:bg-muted/50"}`}
                    >
                      <span className="text-2xl">{c.emoji}</span>
                      <span className="text-sm font-semibold">{c.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-base font-bold">{t("page.annonces.publish.photos")}</h2>
                <div className="bg-muted/30 rounded-xl p-3 text-xs text-muted-foreground flex items-start gap-2 border border-border/20">
                  <Camera className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{t("page.annonces.publish.photos_hint")}</p>
                    <p className="mt-0.5">{t("page.annonces.publish.photos_cover_hint")}</p>
                  </div>
                </div>
                {draft.photoUrls.length < 3 && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 rounded-xl px-3 py-2 font-medium">
                    <Info className="h-3.5 w-3.5" />
                    {t("page.annonces.publish.photos_required").replace("{{count}}", String(3 - draft.photoUrls.length))}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {draft.photoUrls.map((url, i) => (
                    <div
                      key={i}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
                        if (isNaN(fromIdx) || fromIdx === i) return;
                        const reordered = [...draft.photoUrls];
                        const [moved] = reordered.splice(fromIdx, 1);
                        reordered.splice(i, 0, moved);
                        setField("photoUrls", reordered);
                      }}
                      className="relative aspect-square rounded-xl overflow-hidden bg-muted cursor-grab active:cursor-grabbing group"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i)} className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"><X className="h-3 w-3" /></button>
                      {i === 0 && <div className="absolute bottom-1.5 left-1.5 bg-primary text-primary-foreground text-[0.5625rem] px-2 py-0.5 rounded-full font-bold shadow-sm">{t("page.annonces.publish.cover")}</div>}
                    </div>
                  ))}
                  {draft.photoUrls.length < 10 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all active:scale-95">
                      <Camera className="h-7 w-7 text-muted-foreground mb-1.5" />
                      <span className="text-[0.625rem] text-muted-foreground font-medium">{t("page.annonces.publish.add")}</span>
                      <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <h2 className="text-base font-bold">{t("page.annonces.publish.price_label")}</h2>
                <div className="grid grid-cols-2 gap-2">
                  {C2C_PRICE_TYPES.map(pt => (
                    <motion.button
                      key={pt.value}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setField("priceType", pt.value)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${draft.priceType === pt.value ? "border-primary bg-primary/5 shadow-md shadow-primary/10" : "border-border/50 hover:bg-muted/50"}`}
                    >
                      <span className="text-xl">{pt.emoji}</span>
                      <p className="text-sm font-semibold mt-1">{pt.label}</p>
                    </motion.button>
                  ))}
                </div>
                {(draft.priceType === "fixed" || draft.priceType === "negotiable") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input type="number" value={draft.price ?? ""} onChange={e => setField("price", e.target.value ? Number(e.target.value) : null)} placeholder="Prix" min={0} className="h-11 text-lg font-bold" />
                      </div>
                      <div className="relative">
                        <select value={draft.currency} onChange={e => setField("currency", e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm w-24 h-11 appearance-none pr-8">
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                          <option value="AED">AED</option>
                          <option value="GBP">GBP</option>
                          <option value="MAD">MAD</option>
                          <option value="TND">TND</option>
                          <option value="XOF">XOF</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                    {draft.priceType === "negotiable" && (
                      <p className="text-[0.625rem] text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Info className="h-3 w-3" /> {t("page.annonces.publish.negotiable_hint")}
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <h2 className="text-base font-bold">{t("page.annonces.publish.location")}</h2>
                <div>
                  <label className="text-sm font-semibold">{t("page.annonces.publish.city")} <span className="text-red-500">*</span></label>
                  <Input value={draft.city} onChange={e => setField("city", e.target.value)} placeholder="Paris, Lyon, Marseille..." className="mt-1.5 h-11" />
                </div>
                <div>
                  <label className="text-sm font-semibold">{t("page.annonces.publish.neighbourhood")}</label>
                  <Input value={draft.quartier} onChange={e => setField("quartier", e.target.value)} placeholder={t("page.annonces.publish.neighbourhood")} className="mt-1.5 h-11" />
                </div>
                <div>
                  <label className="text-sm font-semibold">{t("page.annonces.publish.country_label")}</label>
                  <Input value={draft.country} onChange={e => setField("country", e.target.value)} placeholder="France" className="mt-1.5 h-11" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const loc = useLocationStore.getState();
                    const lat = loc.getLat();
                    const lng = loc.getLng();
                    if (lat != null && lng != null) {
                      setField("lat", lat);
                      setField("lng", lng);
                      toast.success(tc("c2c.position_detected"));
                    } else {
                      toast.error(tc("c2c.position_error"));
                    }
                  }}
                  className="flex items-center gap-2 text-sm text-primary font-semibold hover:underline active:scale-95 transition-transform"
                >
                  <MapPin className="h-4 w-4" /> {t("page.annonces.publish.use_position")}
                </button>
                {draft.lat && draft.lng && (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                    📍 Position : {draft.lat.toFixed(4)}, {draft.lng.toFixed(4)}
                  </p>
                )}
              </div>
            )}

            {step === 7 && (
              <div className="space-y-4">
                <h2 className="text-base font-bold">{t("page.annonces.publish.delivery_options")}</h2>
                {C2C_DELIVERY_OPTIONS.map(opt => (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setField("deliveryOption", opt.value)}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${draft.deliveryOption === opt.value ? "border-primary bg-primary/5 shadow-md shadow-primary/10" : "border-border/50 hover:bg-muted/50"}`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-sm font-semibold">{opt.label}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {step === 8 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-bold">{t("page.annonces.publish.preview_title")}</h2>
                </div>
                <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-lg">
                  {draft.photoUrls[0] && (
                    <div className="relative">
                      <img src={draft.photoUrls[0]} alt="" className="w-full h-52 object-cover" />
                      {draft.photoUrls.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[0.625rem] px-2 py-0.5 rounded-full font-medium backdrop-blur-sm">
                          {draft.photoUrls.length} photos
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-4 space-y-2.5">
                    <h3 className="font-extrabold text-lg">{draft.title || t("page.annonces.publish.listing_title_default")}</h3>
                    <p className="text-xl font-black text-primary">
                      {draft.priceType === "free" ? t("page.annonces.free") : draft.priceType === "on_demand" ? t("page.annonces.publish.on_demand") :
                        new Intl.NumberFormat("fr-FR", { style: "currency", currency: draft.currency }).format(draft.price ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{draft.description}</p>
                    <div className="flex gap-2 flex-wrap text-xs text-muted-foreground pt-1">
                      {draft.city && (
                        <span className="flex items-center gap-1 bg-muted/30 px-2 py-1 rounded-full">
                          <MapPin className="h-3 w-3" />{draft.city}
                        </span>
                      )}
                      {draft.condition && (
                        <span className="bg-muted/30 px-2 py-1 rounded-full">
                          {C2C_CONDITIONS.find(c => c.value === draft.condition)?.emoji} {C2C_CONDITIONS.find(c => c.value === draft.condition)?.label}
                        </span>
                      )}
                      {draft.deliveryOption && (
                        <span className="bg-muted/30 px-2 py-1 rounded-full">
                          {C2C_DELIVERY_OPTIONS.find(d => d.value === draft.deliveryOption)?.emoji} {C2C_DELIVERY_OPTIONS.find(d => d.value === draft.deliveryOption)?.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-500/10 rounded-xl p-3 text-sm text-red-600">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/50 p-4 z-30"
        >
          <div className="max-w-lg mx-auto flex gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={prevStep} className="flex-1 h-12 rounded-xl font-bold">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> {t("page.annonces.publish.back")}
              </Button>
            )}
            {step < 8 ? (
              <Button onClick={nextStep} disabled={!canNext()} className="flex-1 h-12 rounded-xl font-bold shadow-lg shadow-primary/20">
                {t("page.annonces.publish.next")} <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <div className="flex gap-2 flex-1">
                <Button variant="outline" onClick={() => handlePublish(true)} disabled={publishing} className="flex-1 h-12 rounded-xl font-bold">
                  {t("page.annonces.publish.draft")}
                </Button>
                <Button onClick={() => handlePublish(false)} disabled={publishing} className="flex-1 h-12 rounded-xl font-bold shadow-lg shadow-primary/20">
                  <Check className="h-4 w-4 mr-1" /> {publishing ? t("page.annonces.publish.publishing") : t("page.annonces.publish.publish_btn")}
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </SubPageShell>
  );
}
