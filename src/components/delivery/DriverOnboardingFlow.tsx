/**
 * DriverOnboardingFlow — Driver registration with vehicle, documents, and coverage zone.
 * PASS81-O: Driver Onboarding
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, FileText, MapPin, CheckCircle2, ChevronRight, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  onComplete?: () => void;
  className?: string;
}

type Step = "vehicle" | "documents" | "zone" | "review";

const VEHICLE_TYPES = [
  { value: "bicycle", label: "🚲 Vélo", desc: "Petits colis urbains" },
  { value: "scooter", label: "🛵 Scooter", desc: "Livraisons rapides" },
  { value: "car", label: "🚗 Voiture", desc: "Colis moyens" },
  { value: "van", label: "🚐 Utilitaire", desc: "Gros volumes" },
  { value: "truck", label: "🚛 Camion", desc: "Palettes, meubles" },
];

const STEPS: { key: Step; label: string; icon: typeof Truck }[] = [
  { key: "vehicle", label: "Véhicule", icon: Truck },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "zone", label: "Zone", icon: MapPin },
  { key: "review", label: "Validation", icon: CheckCircle2 },
];

export default function DriverOnboardingFlow({ onComplete, className }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("vehicle");
  const [submitting, setSubmitting] = useState(false);

  const [vehicleType, setVehicleType] = useState("car");
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");

  const [idDocUrl, setIdDocUrl] = useState("");
  const [licenseDocUrl, setLicenseDocUrl] = useState("");
  const [insuranceDocUrl, setInsuranceDocUrl] = useState("");

  const [maxDistanceKm, setMaxDistanceKm] = useState(15);
  const [coverageCity, setCoverageCity] = useState("");
  const [coverageNotes, setCoverageNotes] = useState("");

  const stepIndex = STEPS.findIndex(s => s.key === step);
  const canProceed = () => {
    if (step === "vehicle") return !!vehicleType;
    if (step === "documents") return true;
    if (step === "zone") return maxDistanceKm > 0;
    return true;
  };

  const nextStep = () => {
    const idx = stepIndex;
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  };
  const prevStep = () => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1].key);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Upsert rider presence (canonical)
      const { error } = await (supabase as any)
        .from("rider_presence")
        .upsert({
          user_id: user.id,
          vehicle_type: vehicleType,
          is_online: false,
          is_available: false,
          rider_profile_id: user.id,
          service_modes: [vehicleType === "car" ? "taxi" : "food_delivery", "parcel_delivery"],
        }, { onConflict: "user_id" });

      if (error) throw error;

      // Update profile
      await supabase.from("profiles").update({
        onboarding_completed: true,
      }).eq("id", user.id);

      toast.success("Inscription livreur terminée !");
      onComplete?.();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'inscription");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File, setter: (url: string) => void) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `driver-docs/${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("documents").upload(path, file);
    if (error) { toast.error("Échec upload"); return; }
    const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);
    setter(publicUrl);
    toast.success("Document téléversé");
  };

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Step indicator */}
      <div className="flex items-center gap-1 px-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === stepIndex;
          const done = i < stepIndex;
          return (
            <div key={s.key} className="flex items-center gap-1 flex-1">
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: done ? "hsl(var(--success))" : active ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-border) / 0.15)",
                  }}>
                  <Icon className="h-3 w-3" style={{ color: done || active ? "#fff" : "hsl(var(--hud-text-dim) / 0.4)" }} />
                </div>
                <span className="text-[9px] truncate" style={{ color: active ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)" }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--hud-border) / 0.2)" }} />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className="rounded-xl p-4 space-y-3"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.12)" }}>

          {step === "vehicle" && (
            <>
              <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>🚗 Type de véhicule</h3>
              <div className="grid grid-cols-2 gap-2">
                {VEHICLE_TYPES.map(v => (
                  <button key={v.value}
                    onClick={() => setVehicleType(v.value)}
                    className="rounded-lg p-3 text-left transition-all"
                    style={{
                      background: vehicleType === v.value ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-border) / 0.06)",
                      border: `1px solid ${vehicleType === v.value ? "hsl(var(--hud-cyan) / 0.3)" : "hsl(var(--hud-border) / 0.08)"}`,
                    }}>
                    <p className="text-sm font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{v.label}</p>
                    <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{v.desc}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Modèle (optionnel)</Label>
                <Input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="Ex: Renault Kangoo"
                  className="h-8 text-xs" style={{ background: "hsl(var(--hud-border) / 0.06)" }} />
                <Label className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Plaque (optionnel)</Label>
                <Input value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="AA-123-BB"
                  className="h-8 text-xs" style={{ background: "hsl(var(--hud-border) / 0.06)" }} />
              </div>
            </>
          )}

          {step === "documents" && (
            <>
              <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>📄 Documents</h3>
              <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                Téléversez vos documents pour vérification. Optionnel pour commencer.
              </p>
              {[
                { label: "Pièce d'identité", url: idDocUrl, setter: setIdDocUrl },
                { label: "Permis de conduire", url: licenseDocUrl, setter: setLicenseDocUrl },
                { label: "Assurance véhicule", url: insuranceDocUrl, setter: setInsuranceDocUrl },
              ].map(doc => (
                <div key={doc.label} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium" style={{ color: "hsl(var(--hud-text))" }}>{doc.label}</p>
                    {doc.url && <p className="text-[9px] truncate" style={{ color: "hsl(var(--success))" }}>✓ Téléversé</p>}
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept="image/*,.pdf"
                      onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], doc.setter)} />
                    <div className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                      style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
                      <Upload className="h-3 w-3" /> Upload
                    </div>
                  </label>
                </div>
              ))}
            </>
          )}

          {step === "zone" && (
            <>
              <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>📍 Zone de couverture</h3>
              <div className="space-y-2">
                <Label className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Distance max (km)</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={50} value={maxDistanceKm}
                    onChange={e => setMaxDistanceKm(Number(e.target.value))}
                    className="flex-1 accent-[hsl(var(--hud-cyan))]" />
                  <span className="text-sm font-bold w-12 text-right" style={{ color: "hsl(var(--hud-cyan))" }}>{maxDistanceKm} km</span>
                </div>
                <Label className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Ville principale</Label>
                <Input value={coverageCity} onChange={e => setCoverageCity(e.target.value)} placeholder="Ex: Paris"
                  className="h-8 text-xs" style={{ background: "hsl(var(--hud-border) / 0.06)" }} />
                <Label className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Notes (optionnel)</Label>
                <Textarea value={coverageNotes} onChange={e => setCoverageNotes(e.target.value)}
                  placeholder="Zones spécifiques, horaires préférés..."
                  className="text-xs min-h-[60px]" style={{ background: "hsl(var(--hud-border) / 0.06)" }} />
              </div>
            </>
          )}

          {step === "review" && (
            <>
              <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>✅ Récapitulatif</h3>
              <div className="space-y-2">
                {[
                  { label: "Véhicule", value: VEHICLE_TYPES.find(v => v.value === vehicleType)?.label || vehicleType },
                  { label: "Modèle", value: vehicleModel || "—" },
                  { label: "Plaque", value: licensePlate || "—" },
                  { label: "Distance max", value: `${maxDistanceKm} km` },
                  { label: "Ville", value: coverageCity || "—" },
                  { label: "Documents", value: [idDocUrl, licenseDocUrl, insuranceDocUrl].filter(Boolean).length + "/3 téléversés" },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center py-1 border-b"
                    style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
                    <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{r.label}</span>
                    <span className="text-[11px] font-medium" style={{ color: "hsl(var(--hud-text))" }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Nav */}
      <div className="flex gap-2">
        {stepIndex > 0 && (
          <Button variant="outline" size="sm" onClick={prevStep} className="text-xs flex-1">Retour</Button>
        )}
        {step !== "review" ? (
          <Button size="sm" onClick={nextStep} disabled={!canProceed()} className="text-xs flex-1"
            style={{ background: "hsl(var(--hud-cyan))", color: "#fff" }}>
            Suivant <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        ) : (
          <Button size="sm" onClick={handleSubmit} disabled={submitting} className="text-xs flex-1"
            style={{ background: "hsl(var(--success))", color: "#fff" }}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Valider mon inscription"}
          </Button>
        )}
      </div>
    </div>
  );
}
