import { Shield, ArrowRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { KYCLevel } from "@/lib/systems/compliance-engine";
import type { DocumentType } from "@/lib/systems/compliance-engine";

const LEVEL_LABELS: Record<KYCLevel, string> = {
  none: "None",
  basic: "Basic",
  standard: "Standard",
  enhanced: "Enhanced",
  full: "Full",
};

const DOC_LABELS: Record<string, string> = {
  national_id: "National ID",
  passport: "Passport",
  driving_license: "Driving License",
  selfie: "Selfie",
  utility_bill: "Utility Bill",
  bank_statement: "Bank Statement",
  trade_license: "Trade License",
  tax_certificate: "Tax Certificate",
  residence_permit: "Residence Permit",
  taxi_license: "Taxi/VTC License",
  commercial_insurance: "Commercial Insurance",
  vehicle_registration: "Vehicle Registration",
  criminal_record: "Criminal Record",
  professional_certificate: "Professional Certificate",
};

interface KycRequiredSheetProps {
  open: boolean;
  onClose: () => void;
  currentLevel: KYCLevel;
  requiredLevel: KYCLevel;
  missingDocuments: DocumentType[];
}

export default function KycRequiredSheet({
  open,
  onClose,
  currentLevel,
  requiredLevel,
  missingDocuments,
}: KycRequiredSheetProps) {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl p-6 space-y-5 animate-in slide-in-from-bottom">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Verification Required</h2>
            <p className="text-sm text-muted-foreground">Complete your KYC to unlock this feature</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
          <div className="text-center flex-1">
            <div className="text-xs text-muted-foreground mb-1">Current Level</div>
            <div className="text-sm font-bold text-foreground">{LEVEL_LABELS[currentLevel]}</div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="text-center flex-1">
            <div className="text-xs text-muted-foreground mb-1">Required Level</div>
            <div className="text-sm font-bold text-amber-500">{LEVEL_LABELS[requiredLevel]}</div>
          </div>
        </div>

        {missingDocuments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Missing Documents
            </p>
            <div className="space-y-1.5">
              {missingDocuments.map((doc) => (
                <div
                  key={doc}
                  className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-lg bg-muted/30"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {DOC_LABELS[doc] || doc}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onClose();
              navigate("/pro/compliance");
            }}
            className="flex-1 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-bold flex items-center justify-center gap-2"
          >
            Complete Verification
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
