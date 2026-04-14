import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import SubPageShell from "@/components/layout/SubPageShell";
import { useFlightFlow } from "@/hooks/useFlightFlow";
import { useAuth } from "@/contexts/AuthContext";
import type { Passenger, PassengerType } from "@/domains/flight/flight-types";
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = "hsl(225 22% 16%)";
const GOLD = "hsl(var(--accent))";

interface PassengerForm {
  type: PassengerType;
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
}

function emptyForm(type: PassengerType): PassengerForm {
  return { type, title: "Mr", firstName: "", lastName: "", dateOfBirth: "", nationality: "", passportNumber: "", passportExpiry: "" };
}

function InputField({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-muted-foreground block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-border/30 bg-card text-xs font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

export default function FlightPassengerPage() {
  useUiEngine("travel-flightpassengerpage");
  const { selectedOffer, searchParams, submitPassengers, loading, error, clearError } = useFlightFlow();
  const { user } = useAuth();

  const paxCounts = searchParams?.passengers ?? { adults: 1, children: 0, infants: 0 };
  const totalPax = paxCounts.adults + paxCounts.children + paxCounts.infants;

  const [forms, setForms] = useState<PassengerForm[]>(() => {
    const list: PassengerForm[] = [];
    for (let i = 0; i < paxCounts.adults; i++) list.push(emptyForm("adult"));
    for (let i = 0; i < paxCounts.children; i++) list.push(emptyForm("child"));
    for (let i = 0; i < paxCounts.infants; i++) list.push(emptyForm("infant"));
    return list;
  });

  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [contactPhone, setContactPhone] = useState(user?.user_metadata?.phone ?? "");

  const updateForm = useCallback((idx: number, field: keyof PassengerForm, value: string) => {
    setForms((prev) => prev.map((f, i) => (i === idx ? { ...f, [field]: value } : f)));
  }, []);

  const isValid = forms.every((f) => f.firstName && f.lastName && f.dateOfBirth) && contactEmail;

  const handleSubmit = useCallback(() => {
    if (!isValid || !user?.id) return;
    clearError();

    const passengers: Passenger[] = forms.map((f, i) => ({
      passengerId: `pax_${i}_${Date.now()}`,
      type: f.type,
      title: f.title,
      firstName: f.firstName,
      lastName: f.lastName,
      dateOfBirth: f.dateOfBirth,
      nationality: f.nationality || undefined,
      passportNumber: f.passportNumber || undefined,
      passportExpiry: f.passportExpiry || undefined,
      email: i === 0 ? contactEmail : undefined,
      phone: i === 0 ? contactPhone : undefined,
    }));

    submitPassengers(user.id, passengers, contactEmail, contactPhone);
  }, [forms, contactEmail, contactPhone, user?.id, isValid, submitPassengers, clearError]);

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Passenger Details" backTo="/travel/flight-detail" />

      <div className="px-4 space-y-4 pt-2">
        {selectedOffer && (
          <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: `${NAVY}06`, border: `1px solid ${NAVY}10` }}>
            <span className="text-sm">✈️</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground line-clamp-1 break-words">
                {selectedOffer.segments[0].origin} → {selectedOffer.segments[selectedOffer.segments.length - 1].destination}
              </p>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {selectedOffer.currency} {selectedOffer.totalPrice.toFixed(0)} · {totalPax} passenger{totalPax > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}

        <div className="p-3 rounded-xl border border-border/15 bg-card/50 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-bold text-foreground">Contact Information</span>
          </div>
          <InputField label="Email" value={contactEmail} onChange={setContactEmail} type="email" placeholder="your@email.com" />
          <InputField label="Phone" value={contactPhone} onChange={setContactPhone} type="tel" placeholder="+33 6 12 34 56 78" />
        </div>

        {forms.map((form, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-3 rounded-xl border border-border/15 bg-card/50 space-y-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-bold text-foreground">
                Passenger {idx + 1}
                <span className="text-[10px] font-normal text-muted-foreground ml-1 capitalize">({form.type})</span>
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {["Mr", "Mrs", "Ms", "Dr"].map((t) => (
                <button
                  key={t}
                  onClick={() => updateForm(idx, "title", t)}
                  className="py-1.5 rounded-lg text-[10px] font-semibold border transition-colors"
                  style={{
                    background: form.title === t ? NAVY : "transparent",
                    color: form.title === t ? "#fff" : "var(--muted-foreground)",
                    borderColor: form.title === t ? NAVY : "var(--border)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <InputField label="First name" value={form.firstName} onChange={(v) => updateForm(idx, "firstName", v)} placeholder="John" />
              <InputField label="Last name" value={form.lastName} onChange={(v) => updateForm(idx, "lastName", v)} placeholder="Doe" />
            </div>

            <InputField label="Date of birth" value={form.dateOfBirth} onChange={(v) => updateForm(idx, "dateOfBirth", v)} type="date" />

            <div className="grid grid-cols-2 gap-2">
              <InputField label="Nationality" value={form.nationality} onChange={(v) => updateForm(idx, "nationality", v)} placeholder="FR" />
              <InputField label="Passport #" value={form.passportNumber} onChange={(v) => updateForm(idx, "passportNumber", v)} placeholder="Optional" />
            </div>

            {form.passportNumber && (
              <InputField label="Passport expiry" value={form.passportExpiry} onChange={(v) => updateForm(idx, "passportExpiry", v)} type="date" />
            )}
          </motion.div>
        ))}

        {error && (
          <div className="p-3 rounded-xl text-xs font-semibold" style={{ background: "hsl(0 72% 58% / 0.08)", color: "hsl(0 72% 58%)" }}>
            {error}
          </div>
        )}
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 z-40">
        <Button
          onClick={handleSubmit}
          disabled={loading || !isValid}
          className="w-full h-12 rounded-xl font-bold text-sm"
          style={{ background: NAVY, color: "#fff" }}
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating booking...</>
          ) : (
            `Continue to payment · ${selectedOffer?.currency ?? ""} ${selectedOffer?.totalPrice.toFixed(0) ?? ""}`
          )}
        </Button>
      </div>
    </SubPageShell>
  );
}
