/**
 * MerchantAlertPanel — Shows improvement suggestions for merchants.
 */
import { AlertTriangle, Camera, FileText, TrendingUp } from "lucide-react";
import { getBusinessEngineState } from "@/lib/engines/autonomous-business-engine";
import { useState, useEffect } from "react";

export function MerchantAlertPanel() {
  const [flags, setFlags] = useState<{ id: string; entityId: string; suggestion: string }[]>([]);

  useEffect(() => {
    const s = getBusinessEngineState();
    setFlags(s.marketplaceFlags.slice(0, 5));
  }, []);

  if (!flags.length) return null;

  const getIcon = (suggestion: string) => {
    if (suggestion.toLowerCase().includes("photo")) return <Camera className="w-4 h-4 text-amber-500" />;
    if (suggestion.toLowerCase().includes("description")) return <FileText className="w-4 h-4 text-blue-500" />;
    return <TrendingUp className="w-4 h-4 text-primary" />;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-foreground">Listing improvements needed</h3>
      </div>
      <div className="space-y-2">
        {flags.map((f) => (
          <div key={f.id} className="flex items-start gap-2.5 p-2 rounded-xl bg-muted/30">
            {getIcon(f.suggestion)}
            <p className="text-xs text-muted-foreground flex-1">{f.suggestion}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
