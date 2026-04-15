import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUiEngine } from "@/hooks/useUiEngine";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import SubPageShell from "@/components/layout/SubPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  User, Car, FileText, MapPin, Shield,
  ArrowRight, ArrowLeft, Loader2, Upload, CheckCircle2,
  Camera, Plus, Trash2,
} from "lucide-react";

const STEPS = [
  { key: "personal", label: "Personal Info", icon: User },
  { key: "vehicle", label: "Vehicle", icon: Car },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "zone", label: "Operation Zone", icon: MapPin },
  { key: "terms", label: "Terms & Conditions", icon: Shield },
];

const VEHICLE_TYPES = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "van", label: "Van" },
  { value: "luxury", label: "Luxury" },
];

const PREFERRED_ZONES = [
  "Airport", "City Center", "Business District", "Marina",
  "Downtown", "Suburbs", "Industrial", "Tourist Areas",
];

interface DocUploadState {
  driverLicenseFront: boolean;
  driverLicenseBack: boolean;
  taxiLicense: boolean;
  commercialInsurance: boolean;
  vehicleRegistration: boolean;
  criminalRecord: boolean;
}

export default function TaxiDriverOnboardingWizard() {
  useUiEngine("onboarding-taxi-driver");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

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
        const ext = file.name.split(".").pop() || "jpg";
        const filePath = `${user.id}/${docType}-${Date.now()}.${ext}`;

        await supabase.storage.from("kyc-documents").upload(filePath, file, { upsert: false });

        await supabase.from("kyc_documents").insert({
          user_id: user.id,
          document_type: docType,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          status: "pending",
        });

        setDocs((prev) => ({ ...prev, [fieldKey]: true }));
        toast.success("Document uploaded");
      } catch (err: any) {
        toast.error("Upload failed");
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
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/vehicle-${Date.now()}.${ext}`;
      await supabase.storage.from("onboarding-media").upload(path, file, { upsert: true });
      const { data } = supabase.storage.from("onboarding-media").getPublicUrl(path);
      if (data?.publicUrl) setVehiclePhotos((p) => [...p, data.publicUrl]);
    };
    input.click();
  };

  const toggleZone = (z: string) => {
    setZone((prev) => ({
      ...prev,
      preferredZones: prev.preferredZones.includes(z)
        ? prev.preferredZones.filter((x) => x !== z)
        : [...prev.preferredZones, z],
    }));
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("providers").upsert({
        user_id: user.id,
        provider_type: "taxi_driver",
        display_name: personal.fullName,
        profile_photo_url: profilePhoto,
        address_line1: zone.city,
        city: zone.city,
        country: "AE",
        coverage_radius_km: zone.maxRadiusKm,
        gallery_urls: vehiclePhotos,
        onboarding_status: "completed",
        onboarding_completed_at: new Date().toISOString(),
        kyc_status: "documents_pending",
        is_active: false,
        metadata: {
          date_of_birth: personal.dateOfBirth,
          nationality: personal.nationality,
          phone: personal.phone,
          preferred_zones: zone.preferredZones,
        },
      }, { onConflict: "user_id" });

      if (error) throw error;

      await supabase.from("rider_profiles").upsert({
        user_id: user.id,
        full_name: personal.fullName,
        phone: personal.phone,
        rider_mode: "taxi",
        vehicle_type: vehicle.type === "luxury" ? "taxi_premium" : vehicle.type === "suv" ? "taxi_xl" : "taxi_standard",
        vehicle_brand: vehicle.brand,
        vehicle_model: vehicle.model,
        plate_number: vehicle.plateNumber,
        seats: vehicle.seats,
        is_verified: false,
        is_online: false,
        is_available: false,
      }, { onConflict: "user_id" });

      toast.success("Taxi driver registration complete!");
      navigate("/pro/dashboard");
    } catch (err: any) {
      toast.error("Registration failed: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <SubPageShell noContentPad className="bg-background">
      <div className="px-4 pt-6 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <Car className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">Taxi Driver Registration</h1>
            <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length} — {STEPS[step].label}</p>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />
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
                <label className="text-sm font-medium text-foreground block mb-1">Profile Photo *</label>
                <label className="w-24 h-24 rounded-full border-2 border-dashed border-border/30 cursor-pointer flex items-center justify-center overflow-hidden hover:bg-muted/30 transition">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !user?.id) return;
                    const ext = file.name.split(".").pop() || "jpg";
                    const path = `${user.id}/profile-${Date.now()}.${ext}`;
                    await supabase.storage.from("onboarding-media").upload(path, file, { upsert: true });
                    const { data } = supabase.storage.from("onboarding-media").getPublicUrl(path);
                    if (data?.publicUrl) setProfilePhoto(data.publicUrl);
                  }} />
                </label>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Full Name *</label>
                <Input value={personal.fullName} onChange={(e) => setPersonal({ ...personal, fullName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Date of Birth *</label>
                <Input type="date" value={personal.dateOfBirth} onChange={(e) => setPersonal({ ...personal, dateOfBirth: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Nationality</label>
                <Input value={personal.nationality} onChange={(e) => setPersonal({ ...personal, nationality: e.target.value })} placeholder="e.g. UAE" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Phone Number *</label>
                <Input value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} placeholder="+971..." />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Vehicle Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {VEHICLE_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setVehicle({ ...vehicle, type: t.value })}
                      className={`p-3 rounded-xl text-sm font-medium border ${
                        vehicle.type === t.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/20 text-muted-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Brand *</label>
                  <Input value={vehicle.brand} onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })} placeholder="Toyota" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Model *</label>
                  <Input value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} placeholder="Camry" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Year</label>
                  <Input value={vehicle.year} onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })} placeholder="2024" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Color</label>
                  <Input value={vehicle.color} onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })} placeholder="White" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Plate Number *</label>
                <Input value={vehicle.plateNumber} onChange={(e) => setVehicle({ ...vehicle, plateNumber: e.target.value })} placeholder="A 12345 Dubai" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Passenger Seats</label>
                  <Input type="number" value={vehicle.seats} onChange={(e) => setVehicle({ ...vehicle, seats: parseInt(e.target.value) || 4 })} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input type="checkbox" checked={vehicle.hasAC} onChange={(e) => setVehicle({ ...vehicle, hasAC: e.target.checked })} className="rounded" />
                    Air Conditioning
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Vehicle Photos (min 3 angles)</label>
                <div className="grid grid-cols-3 gap-2">
                  {vehiclePhotos.map((url, i) => (
                    <div key={i} className="relative h-20 rounded-lg overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setVehiclePhotos(vehiclePhotos.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  <button onClick={handleVehiclePhotoUpload} className="h-20 rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Upload required documents for verification</p>
              {[
                { key: "driverLicenseFront" as const, type: "driving_license", label: "Driver's License (Front) *", uploaded: docs.driverLicenseFront },
                { key: "driverLicenseBack" as const, type: "driving_license", label: "Driver's License (Back)", uploaded: docs.driverLicenseBack },
                { key: "taxiLicense" as const, type: "taxi_license", label: "Taxi/VTC License *", uploaded: docs.taxiLicense },
                { key: "commercialInsurance" as const, type: "commercial_insurance", label: "Commercial Vehicle Insurance *", uploaded: docs.commercialInsurance },
                { key: "vehicleRegistration" as const, type: "vehicle_registration", label: "Vehicle Registration Card *", uploaded: docs.vehicleRegistration },
                { key: "criminalRecord" as const, type: "criminal_record", label: "Criminal Record (optional)", uploaded: docs.criminalRecord },
              ].map((doc) => (
                <div
                  key={doc.key}
                  className="rounded-xl border border-border/20 bg-card p-3 flex items-center gap-3"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc.uploaded ? "bg-green-500/10" : "bg-muted"}`}>
                    {doc.uploaded ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <span className="flex-1 text-sm text-foreground">{doc.label}</span>
                  {!doc.uploaded && (
                    <button
                      onClick={() => handleDocUpload(doc.type, doc.key)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      <Upload className="w-3 h-3" /> Upload
                    </button>
                  )}
                  {doc.uploaded && (
                    <span className="text-xs text-green-500 font-medium">Uploaded</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Main City *</label>
                <Input value={zone.city} onChange={(e) => setZone({ ...zone, city: e.target.value })} placeholder="Dubai" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Max Radius (km)</label>
                <Input type="number" value={zone.maxRadiusKm} onChange={(e) => setZone({ ...zone, maxRadiusKm: parseInt(e.target.value) || 30 })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Preferred Zones</label>
                <div className="grid grid-cols-2 gap-2">
                  {PREFERRED_ZONES.map((z) => (
                    <button
                      key={z}
                      onClick={() => toggleZone(z)}
                      className={`p-2.5 rounded-xl text-sm font-medium border ${
                        zone.preferredZones.includes(z)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/20 text-muted-foreground"
                      }`}
                    >
                      {zone.preferredZones.includes(z) && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                      {z}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/30 p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground">Terms & Conditions</h3>
                <div className="text-xs text-muted-foreground space-y-2 max-h-48 overflow-y-auto">
                  <p>By registering as a taxi driver on this platform, you agree to:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Maintain a valid driver's license and taxi/VTC license at all times</li>
                    <li>Keep your vehicle in safe, clean condition</li>
                    <li>Maintain valid commercial vehicle insurance</li>
                    <li>Follow all applicable traffic laws and regulations</li>
                    <li>Provide courteous, professional service to all passengers</li>
                    <li>Accept the platform's commission rate and payout terms</li>
                    <li>Not engage in discrimination of any kind</li>
                    <li>Report any accidents or incidents immediately</li>
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
                <span className="text-sm text-foreground">I accept the terms & conditions and driving rules</span>
              </label>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur border-t border-border/10">
        <div className="flex gap-3 max-w-lg mx-auto">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="flex-1">
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || !canNext()} className="flex-1">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Complete Registration
            </Button>
          )}
        </div>
      </div>
    </SubPageShell>
  );
}
