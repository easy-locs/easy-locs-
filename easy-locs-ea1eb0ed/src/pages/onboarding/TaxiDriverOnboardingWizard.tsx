import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDeferredUiEngine } from "@/hooks/useDeferredUiEngine";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import SubPageShell from "@/components/layout/SubPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  uploadOnboardingMedia,
  uploadKycDocumentFile,
  submitTaxiDriverProvider,
} from "@/services/onboarding.service";
import {
  User, Car, FileText, MapPin, Shield,
  ArrowRight, ArrowLeft, Loader2, Upload, CheckCircle2,
  Camera, Plus, Trash2,
} from "lucide-react";

interface DocUploadState {
  driverLicenseFront: boolean;
  driverLicenseBack: boolean;
  taxiLicense: boolean;
  commercialInsurance: boolean;
  vehicleRegistration: boolean;
  criminalRecord: boolean;
}

export default function TaxiDriverOnboardingWizard() {
  const { timedOut: uiTimedOut } = useDeferredUiEngine("onboarding-taxi-driver");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const dir = (locale === "ar" || locale === "he" || locale === "ur" || locale === "fa") ? "rtl" : "ltr";
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const STEPS = [
    { key: "personal", label: t("taxi.step_personal" as any), icon: User },
    { key: "vehicle", label: t("taxi.step_vehicle" as any), icon: Car },
    { key: "documents", label: t("taxi.step_documents" as any), icon: FileText },
    { key: "zone", label: t("taxi.step_zone" as any), icon: MapPin },
    { key: "terms", label: t("taxi.step_terms" as any), icon: Shield },
  ];

  const VEHICLE_TYPES = [
    { value: "sedan", label: t("taxi.sedan" as any) },
    { value: "suv", label: t("taxi.suv" as any) },
    { value: "van", label: t("taxi.van" as any) },
    { value: "luxury", label: t("taxi.luxury" as any) },
  ];

  const PREFERRED_ZONES = [
    { id: "airport", key: "taxi.zone_airport" },
    { id: "city_center", key: "taxi.zone_city_center" },
    { id: "business", key: "taxi.zone_business" },
    { id: "marina", key: "taxi.zone_marina" },
    { id: "downtown", key: "taxi.zone_downtown" },
    { id: "suburbs", key: "taxi.zone_suburbs" },
    { id: "industrial", key: "taxi.zone_industrial" },
    { id: "tourist", key: "taxi.zone_tourist" },
  ] as const;

  const [personal, setPersonal] = useState({
    fullName: "",
    dateOfBirth: "",
    nationality: "",
    phone: "",
  });

  const [vehicle, setVehicle] = useState({
    type: "sedan",
    brand: "",
    model: "",
    year: "",
    color: "",
    plateNumber: "",
    seats: 4,
    hasAC: true,
  });
  const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const MIN_VEHICLE_PHOTOS = 3;

  const [docs, setDocs] = useState<DocUploadState>({
    driverLicenseFront: false,
    driverLicenseBack: false,
    taxiLicense: false,
    commercialInsurance: false,
    vehicleRegistration: false,
    criminalRecord: false,
  });

  const [zone, setZone] = useState({
    city: "Dubai",
    maxRadiusKm: 30,
    preferredZones: [] as string[],
  });

  const [termsAccepted, setTermsAccepted] = useState(false);

  const canNext = useCallback(() => {
    if (step === 0) return personal.fullName && personal.phone && personal.dateOfBirth && !!profilePhoto;
    if (step === 1) return vehicle.brand && vehicle.plateNumber && vehicle.model && vehiclePhotos.length >= MIN_VEHICLE_PHOTOS;
    if (step === 2) return docs.driverLicenseFront && docs.taxiLicense && docs.commercialInsurance && docs.vehicleRegistration;
    if (step === 3) return zone.city;
    if (step === 4) return termsAccepted;
    return true;
  }, [step, personal, vehicle, docs, zone, termsAccepted]);

  const handleDocUpload = async (docType: string, fieldKey: keyof DocUploadState) => {
    if (!user?.id) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        await uploadKycDocumentFile(user.id, docType, file);
        setDocs((prev) => ({ ...prev, [fieldKey]: true }));
        toast.success(t("taxi.document_uploaded" as any));
      } catch (err: any) {
        toast.error(t("taxi.upload_failed" as any));
      }
    };
    input.click();
  };

  const handleVehiclePhotoUpload = async () => {
    if (!user?.id) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const url = await uploadOnboardingMedia(user.id, file, "vehicle");
      if (url) setVehiclePhotos((p) => [...p, url]);
    };
    input.click();
  };

  const toggleZone = (id: string) => {
    setZone((prev) => ({
      ...prev,
      preferredZones: prev.preferredZones.includes(id)
        ? prev.preferredZones.filter((x) => x !== id)
        : [...prev.preferredZones, id],
    }));
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      await submitTaxiDriverProvider({
        userId: user.id,
        personal,
        profilePhoto,
        zone,
        vehiclePhotos,
        vehicle,
      });

      toast.success(t("taxi.registration_complete" as any));
      navigate("/pro/dashboard");
    } catch (err: any) {
      toast.error(t("taxi.registration_failed" as any) + ": " + (err.message || t("ob.unknown_error" as any)));
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <SubPageShell noContentPad className="bg-background">
      <div dir={dir} className="px-4 pt-6 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <Car className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">{t("taxi.registration_title" as any)}</h1>
            <p className="text-xs text-muted-foreground">
              {(t("taxi.step_of" as any) as string).replace("{current}", String(step + 1)).replace("{total}", String(STEPS.length))} — {STEPS[step].label}
            </p>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" aria-label={`Registration progress: step ${step + 1} of ${STEPS.length}`} />
        {uiTimedOut && (
          <p className="text-[0.625rem] text-amber-500/60 mt-1">⚠ UI engine timed out — form remains fully functional</p>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="px-4 pb-32 space-y-4"
        >
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium text-foreground block mb-1">{t("taxi.profile_photo" as any)} *</label>
                <label className="w-24 h-24 rounded-full border-2 border-dashed border-border/30 cursor-pointer flex items-center justify-center overflow-hidden hover:bg-muted/30 transition">
                  {profilePhoto ? (
                    <img loading="lazy" src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !user?.id) return;
                    const url = await uploadOnboardingMedia(user.id, file, "profile");
                    if (url) setProfilePhoto(url);
                  }} />
                </label>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("taxi.full_name" as any)} *</label>
                <Input value={personal.fullName} onChange={(e) => setPersonal({ ...personal, fullName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("taxi.date_of_birth" as any)} *</label>
                <Input type="date" value={personal.dateOfBirth} onChange={(e) => setPersonal({ ...personal, dateOfBirth: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("taxi.nationality" as any)}</label>
                <Input value={personal.nationality} onChange={(e) => setPersonal({ ...personal, nationality: e.target.value })} placeholder={t("taxi.ph_nationality" as any)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("taxi.phone_number" as any)} *</label>
                <Input value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} placeholder={t("taxi.ph_phone" as any)} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("taxi.vehicle_type" as any)} *</label>
                <div className="grid grid-cols-2 gap-2">
                  {VEHICLE_TYPES.map((vt) => (
                    <button
                      key={vt.value}
                      onClick={() => setVehicle({ ...vehicle, type: vt.value })}
                      aria-pressed={vehicle.type === vt.value}
                      className={`p-3 rounded-xl text-sm font-medium border ${
                        vehicle.type === vt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/20 text-muted-foreground"
                      }`}
                    >
                      {vt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">{t("taxi.brand" as any)} *</label>
                  <Input value={vehicle.brand} onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })} placeholder={t("taxi.ph_brand" as any)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">{t("taxi.model" as any)} *</label>
                  <Input value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} placeholder={t("taxi.ph_model" as any)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">{t("taxi.year" as any)}</label>
                  <Input value={vehicle.year} onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })} placeholder={t("taxi.ph_year" as any)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">{t("taxi.color" as any)}</label>
                  <Input value={vehicle.color} onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })} placeholder={t("taxi.ph_color" as any)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("taxi.plate_number" as any)} *</label>
                <Input value={vehicle.plateNumber} onChange={(e) => setVehicle({ ...vehicle, plateNumber: e.target.value })} placeholder={t("taxi.ph_plate" as any)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">{t("taxi.passenger_seats" as any)}</label>
                  <Input type="number" value={vehicle.seats} onChange={(e) => setVehicle({ ...vehicle, seats: parseInt(e.target.value) || 4 })} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input type="checkbox" checked={vehicle.hasAC} onChange={(e) => setVehicle({ ...vehicle, hasAC: e.target.checked })} className="rounded" />
                    {t("taxi.air_conditioning" as any)}
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("taxi.vehicle_photos" as any)}</label>
                <div className="grid grid-cols-3 gap-2">
                  {vehiclePhotos.map((url, i) => (
                    <div key={i} className="relative h-20 rounded-lg overflow-hidden">
                      <img loading="lazy" src={url} alt={`Vehicle photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button onClick={() => setVehiclePhotos(vehiclePhotos.filter((_, j) => j !== i))} aria-label={`Remove vehicle photo ${i + 1}`} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  <button onClick={handleVehiclePhotoUpload} aria-label="Upload vehicle photo" className="h-20 rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("taxi.upload_documents" as any)}</p>
              {[
                { key: "driverLicenseFront" as const, type: "driving_license", labelKey: "taxi.driver_license_front", uploaded: docs.driverLicenseFront },
                { key: "driverLicenseBack" as const, type: "driving_license", labelKey: "taxi.driver_license_back", uploaded: docs.driverLicenseBack },
                { key: "taxiLicense" as const, type: "taxi_license", labelKey: "taxi.taxi_license", uploaded: docs.taxiLicense },
                { key: "commercialInsurance" as const, type: "commercial_insurance", labelKey: "taxi.commercial_insurance", uploaded: docs.commercialInsurance },
                { key: "vehicleRegistration" as const, type: "vehicle_registration", labelKey: "taxi.vehicle_registration", uploaded: docs.vehicleRegistration },
                { key: "criminalRecord" as const, type: "criminal_record", labelKey: "taxi.criminal_record", uploaded: docs.criminalRecord },
              ].map((doc) => (
                <div
                  key={doc.key}
                  className="rounded-xl border border-border/20 bg-card p-3 flex items-center gap-3"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc.uploaded ? "bg-green-500/10" : "bg-muted"}`}>
                    {doc.uploaded ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <span className="flex-1 text-sm text-foreground">{t(doc.labelKey as any)}</span>
                  {!doc.uploaded && (
                    <button
                      onClick={() => handleDocUpload(doc.type, doc.key)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      <Upload className="w-3 h-3" /> {t("taxi.upload" as any)}
                    </button>
                  )}
                  {doc.uploaded && (
                    <span className="text-xs text-green-500 font-medium">{t("taxi.uploaded" as any)}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("taxi.main_city" as any)} *</label>
                <Input value={zone.city} onChange={(e) => setZone({ ...zone, city: e.target.value })} placeholder={t("taxi.ph_city" as any)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("taxi.max_radius" as any)}</label>
                <Input type="number" value={zone.maxRadiusKm} onChange={(e) => setZone({ ...zone, maxRadiusKm: parseInt(e.target.value) || 30 })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">{t("taxi.preferred_zones" as any)}</label>
                <div className="grid grid-cols-2 gap-2">
                  {PREFERRED_ZONES.map((pz) => (
                    <button
                      key={pz.id}
                      onClick={() => toggleZone(pz.id)}
                      aria-pressed={zone.preferredZones.includes(pz.id)}
                      className={`p-2.5 rounded-xl text-sm font-medium border ${
                        zone.preferredZones.includes(pz.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/20 text-muted-foreground"
                      }`}
                    >
                      {zone.preferredZones.includes(pz.id) && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                      {t(pz.key as any)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/30 p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground">{t("taxi.terms_title" as any)}</h3>
                <div className="text-xs text-muted-foreground space-y-2 max-h-48 overflow-y-auto">
                  <p>{t("taxi.terms_intro" as any)}</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>{t("taxi.terms_license" as any)}</li>
                    <li>{t("taxi.terms_vehicle" as any)}</li>
                    <li>{t("taxi.terms_insurance" as any)}</li>
                    <li>{t("taxi.terms_laws" as any)}</li>
                    <li>{t("taxi.terms_service" as any)}</li>
                    <li>{t("taxi.terms_commission" as any)}</li>
                    <li>{t("taxi.terms_discrimination" as any)}</li>
                    <li>{t("taxi.terms_incidents" as any)}</li>
                  </ul>
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-foreground">{t("taxi.accept_terms" as any)}</span>
              </label>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur border-t border-border/10">
        <div className="flex gap-3 max-w-lg mx-auto">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-1" /> {t("taxi.back" as any)}
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="flex-1">
              {t("taxi.next" as any)} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || !canNext()} className="flex-1">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              {t("taxi.complete_registration" as any)}
            </Button>
          )}
        </div>
      </div>
    </SubPageShell>
  );
}
