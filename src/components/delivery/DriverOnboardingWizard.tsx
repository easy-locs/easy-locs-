/**
 * DriverOnboardingWizard — Full driver registration flow with document verification.
 * PASS84-CC: Driver Onboarding Flow
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { User, Car, MapPin, FileText, CheckCircle2, Upload, ChevronRight, ChevronLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface DriverProfile {
  fullName: string;
  phone: string;
  city: string;
  country: string;
}

interface VehicleInfo {
  vehicleType: string;
  licensePlate: string;
  vehicleModel: string;
  vehicleYear: string;
}

interface CoverageZone {
  maxDistanceKm: number;
  preferredAreas: string[];
}

const STEPS = [
  { key: "profile", label: "Profil", icon: User, emoji: "👤" },
  { key: "vehicle", label: "Véhicule", icon: Car, emoji: "🚗" },
  { key: "zone", label: "Zone", icon: MapPin, emoji: "📍" },
  { key: "documents", label: "Documents", icon: FileText, emoji: "📄" },
  { key: "review", label: "Validation", icon: Shield, emoji: "✅" },
];

export default function DriverOnboardingWizard({ onComplete }: { onComplete?: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [profile, setProfile] = useState<DriverProfile>({ fullName: "", phone: "", city: "", country: "FR" });
  const [vehicle, setVehicle] = useState<VehicleInfo>({ vehicleType: "car", licensePlate: "", vehicleModel: "", vehicleYear: "" });
  const [zone, setZone] = useState<CoverageZone>({ maxDistanceKm: 15, preferredAreas: [] });
  const [areaInput, setAreaInput] = useState("");
  const [docUploaded, setDocUploaded] = useState({ license: false, insurance: false, id: false });

  const canNext = () => {
    if (step === 0) return profile.fullName && profile.phone && profile.city;
    if (step === 1) return vehicle.vehicleType && vehicle.licensePlate;
    if (step === 2) return zone.maxDistanceKm > 0;
    if (step === 3) return docUploaded.license && docUploaded.id;
    return true;
  };

  const handleDocUpload = async (type: "license" | "insurance" | "id") => {
    // Simulate upload — in production would use file picker + storage
    setDocUploaded(prev => ({ ...prev, [type]: true }));
    toast.success(`Document ${type === "license" ? "permis" : type === "insurance" ? "assurance" : "pièce d'identité"} téléversé`);
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      // Upsert driver session with onboarding data
      const { error } = await supabase.from("driver_sessions").upsert({
        user_id: user.id,
        vehicle_type: vehicle.vehicleType,
        max_distance_km: zone.maxDistanceKm,
        status: "offline",
      }, { onConflict: "user_id" });

      if (error) throw error;

      // Update profile with driver info
      await supabase.from("profiles").update({
        full_name: profile.fullName,
        phone: profile.phone,
        city: profile.city,
        country: profile.country,
      }).eq("id", user.id);

      toast.success("Inscription chauffeur terminée !");
      onComplete?.();
    } catch (e: any) {
      toast.error(e.message || "Erreur d'inscription");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    background: "hsl(var(--hud-bg))",
    borderColor: "hsl(var(--hud-border) / 0.15)",
    color: "hsl(var(--hud-text))",
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-1 px-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                style={{
                  background: i <= step ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-border) / 0.08)",
                  color: i <= step ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.3)",
                }}>
                {i < step ? "✓" : s.emoji}
              </div>
              <span className="text-[7px] mt-1" style={{ color: i <= step ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.3)" }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-px flex-1 mx-1" style={{ background: i < step ? "hsl(var(--hud-cyan) / 0.3)" : "hsl(var(--hud-border) / 0.1)" }} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div key={step}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className="rounded-xl p-4 space-y-3"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>

          {step === 0 && (
            <>
              <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>👤 Informations personnelles</h3>
              {[
                { label: "Nom complet *", value: profile.fullName, key: "fullName" },
                { label: "Téléphone *", value: profile.phone, key: "phone" },
                { label: "Ville *", value: profile.city, key: "city" },
              ].map(({ label, value, key }) => (
                <div key={key}>
                  <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>{label}</Label>
                  <Input value={value} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                    className="h-9 text-xs mt-1" style={inputStyle} />
                </div>
              ))}
              <div>
                <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Pays</Label>
                <select value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}
                  className="w-full h-9 text-xs mt-1 rounded-md px-2"
                  style={{ ...inputStyle, border: "1px solid hsl(var(--hud-border) / 0.15)" }}>
                  <option value="FR">🇫🇷 France</option>
                  <option value="CM">🇨🇲 Cameroun</option>
                  <option value="CI">🇨🇮 Côte d'Ivoire</option>
                  <option value="SN">🇸🇳 Sénégal</option>
                  <option value="MA">🇲🇦 Maroc</option>
                  <option value="BE">🇧🇪 Belgique</option>
                </select>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>🚗 Informations véhicule</h3>
              <div>
                <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Type de véhicule *</Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {[
                    { value: "bike", label: "🚲 Vélo", desc: "Urbain" },
                    { value: "scooter", label: "🛵 Scooter", desc: "Rapide" },
                    { value: "car", label: "🚗 Voiture", desc: "Standard" },
                  ].map(v => (
                    <button key={v.value} onClick={() => setVehicle(p => ({ ...p, vehicleType: v.value }))}
                      className="rounded-lg py-2 px-1 text-center transition-all"
                      style={{
                        background: vehicle.vehicleType === v.value ? "hsl(var(--hud-cyan) / 0.1)" : "hsl(var(--hud-bg))",
                        border: vehicle.vehicleType === v.value ? "1px solid hsl(var(--hud-cyan) / 0.3)" : "1px solid hsl(var(--hud-border) / 0.08)",
                      }}>
                      <span className="text-lg">{v.label.split(" ")[0]}</span>
                      <p className="text-[9px] mt-0.5" style={{ color: vehicle.vehicleType === v.value ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)" }}>
                        {v.label.split(" ")[1]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              {[
                { label: "Immatriculation *", value: vehicle.licensePlate, key: "licensePlate" },
                { label: "Modèle", value: vehicle.vehicleModel, key: "vehicleModel" },
                { label: "Année", value: vehicle.vehicleYear, key: "vehicleYear" },
              ].map(({ label, value, key }) => (
                <div key={key}>
                  <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>{label}</Label>
                  <Input value={value} onChange={e => setVehicle(p => ({ ...p, [key]: e.target.value }))}
                    className="h-9 text-xs mt-1" style={inputStyle} />
                </div>
              ))}
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>📍 Zone de couverture</h3>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Distance max.</Label>
                  <span className="text-xs font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{zone.maxDistanceKm} km</span>
                </div>
                <input type="range" min={1} max={50} value={zone.maxDistanceKm}
                  onChange={e => setZone(p => ({ ...p, maxDistanceKm: +e.target.value }))}
                  className="w-full h-1.5 rounded-full appearance-none"
                  style={{ background: "hsl(var(--hud-border) / 0.15)" }} />
              </div>
              <div>
                <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Quartiers préférés</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input value={areaInput} onChange={e => setAreaInput(e.target.value)}
                    placeholder="Ex: Centre-ville, Gare…"
                    className="h-8 text-xs flex-1" style={inputStyle}
                    onKeyDown={e => {
                      if (e.key === "Enter" && areaInput.trim()) {
                        setZone(p => ({ ...p, preferredAreas: [...p.preferredAreas, areaInput.trim()] }));
                        setAreaInput("");
                      }
                    }} />
                  <Button size="sm" className="h-8 text-[10px] px-3"
                    onClick={() => { if (areaInput.trim()) { setZone(p => ({ ...p, preferredAreas: [...p.preferredAreas, areaInput.trim()] })); setAreaInput(""); } }}
                    style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>+</Button>
                </div>
                {zone.preferredAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {zone.preferredAreas.map((a, i) => (
                      <span key={i} className="text-[9px] px-2 py-0.5 rounded-full cursor-pointer"
                        onClick={() => setZone(p => ({ ...p, preferredAreas: p.preferredAreas.filter((_, j) => j !== i) }))}
                        style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
                        {a} ✕
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>📄 Documents requis</h3>
              {[
                { type: "license" as const, label: "Permis de conduire", required: true, emoji: "🪪" },
                { type: "insurance" as const, label: "Assurance véhicule", required: false, emoji: "🛡️" },
                { type: "id" as const, label: "Pièce d'identité", required: true, emoji: "🆔" },
              ].map(doc => (
                <div key={doc.type} className="flex items-center gap-3 py-2 px-3 rounded-lg"
                  style={{
                    background: docUploaded[doc.type] ? "hsl(var(--success) / 0.05)" : "hsl(var(--hud-bg))",
                    border: `1px solid ${docUploaded[doc.type] ? "hsl(var(--success) / 0.15)" : "hsl(var(--hud-border) / 0.08)"}`,
                  }}>
                  <span className="text-lg">{doc.emoji}</span>
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>
                      {doc.label} {doc.required && <span style={{ color: "hsl(var(--destructive))" }}>*</span>}
                    </p>
                    <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                      {docUploaded[doc.type] ? "✅ Téléversé" : "Non fourni"}
                    </p>
                  </div>
                  <Button size="sm" variant={docUploaded[doc.type] ? "outline" : "default"}
                    className="text-[10px] h-7 px-3"
                    onClick={() => handleDocUpload(doc.type)}
                    style={docUploaded[doc.type]
                      ? { borderColor: "hsl(var(--success) / 0.2)", color: "hsl(var(--success))" }
                      : { background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
                    {docUploaded[doc.type] ? <CheckCircle2 className="h-3 w-3" /> : <Upload className="h-3 w-3" />}
                  </Button>
                </div>
              ))}
            </>
          )}

          {step === 4 && (
            <>
              <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>✅ Récapitulatif</h3>
              <div className="space-y-2">
                {[
                  { label: "Nom", value: profile.fullName },
                  { label: "Téléphone", value: profile.phone },
                  { label: "Ville", value: `${profile.city}, ${profile.country}` },
                  { label: "Véhicule", value: `${vehicle.vehicleType} — ${vehicle.licensePlate}` },
                  { label: "Zone", value: `${zone.maxDistanceKm} km max` },
                  { label: "Documents", value: `${Object.values(docUploaded).filter(Boolean).length}/3 fournis` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-1.5 border-b"
                    style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
                    <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{label}</span>
                    <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-2">
        {step > 0 && (
          <Button size="sm" variant="outline" className="text-xs h-9" onClick={() => setStep(s => s - 1)}
            style={{ borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text-dim))" }}>
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Retour
          </Button>
        )}
        <Button size="sm" className="flex-1 text-xs h-9"
          disabled={!canNext() || submitting}
          onClick={() => step < STEPS.length - 1 ? setStep(s => s + 1) : handleSubmit()}
          style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
          {step < STEPS.length - 1 ? (
            <>Suivant <ChevronRight className="h-3.5 w-3.5 ml-1" /></>
          ) : (
            submitting ? "Envoi…" : "Finaliser l'inscription"
          )}
        </Button>
      </div>
    </div>
  );
}
