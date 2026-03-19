/**
 * QR Generate Page — Create QR codes for merchant tables / counters.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QRCode from "react-qr-code";

interface GeneratedQr {
  targetCode: string;
  targetType: string;
  tableNumber: string | null;
  url: string;
}

export default function QrGeneratePage() {
  const [merchantId, setMerchantId] = useState("");
  const [tableCount, setTableCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<GeneratedQr[]>([]);

  const baseUrl = window.location.origin + "/#/qr/entry/";

  async function handleGenerate() {
    if (!merchantId.trim()) {
      toast.error("Merchant profile ID requis");
      return;
    }

    setLoading(true);
    try {
      const records = Array.from({ length: tableCount }, (_, i) => {
        const code = `${merchantId.slice(0, 8)}-T${String(i + 1).padStart(2, "0")}-${Date.now().toString(36)}`;
        return {
          target_code: code,
          merchant_profile_id: merchantId,
          target_type: "dine_in",
          table_number: String(i + 1),
          active: true,
        };
      });

      const { data, error } = await (supabase as any)
        .from("qr_order_targets")
        .insert(records)
        .select("*");

      if (error) throw error;

      const generated: GeneratedQr[] = (data ?? []).map((r: any) => ({
        targetCode: r.target_code,
        targetType: r.target_type,
        tableNumber: r.table_number,
        url: `${baseUrl}${encodeURIComponent(r.target_code)}`,
      }));

      setCodes(generated);
      toast.success(`${generated.length} QR codes créés`);
    } catch (e: any) {
      toast.error(e.message ?? "Échec de la génération");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Générateur de QR Codes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Créez des QR codes pour les tables d'un restaurant.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Merchant Profile ID
          </label>
          <input
            type="text"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            placeholder="uuid du merchant_onboarding_profiles"
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Nombre de tables
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={tableCount}
            onChange={(e) => setTableCount(Number(e.target.value))}
            className="w-32 bg-muted border border-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Génération…" : "Générer les QR codes"}
        </button>
      </div>

      {codes.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">
            {codes.length} QR Codes générés
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {codes.map((qr) => (
              <div
                key={qr.targetCode}
                className="border border-border rounded-lg p-3 flex flex-col items-center gap-2"
              >
                <QRCode value={qr.url} size={120} />
                <p className="text-xs font-medium text-foreground">
                  Table {qr.tableNumber}
                </p>
                <p className="text-[10px] text-muted-foreground break-all text-center">
                  {qr.targetCode}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
