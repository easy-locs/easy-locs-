/**
 * QR Generate Page — Create QR codes for merchant tables / counters.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { buildQrEntryUrl } from "@/lib/qr/qr-link";

interface GeneratedQr {
  targetCode: string;
  targetType: string;
  tableNumber: string;
  url: string;
}

export default function QrGeneratePage() {
  const [merchantId, setMerchantId] = useState("");
  const [tableCount, setTableCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<GeneratedQr[]>([]);

  async function handleGenerate() {
    if (!merchantId.trim()) {
      toast.error("Merchant profile ID required");
      return;
    }

    setLoading(true);
    try {
      const stamp = Date.now().toString(36);

      const rows = Array.from({ length: tableCount }, (_, i) => ({
        target_code: `${merchantId.slice(0, 8)}-T${String(i + 1).padStart(2, "0")}-${stamp}`,
        merchant_profile_id: merchantId,
        target_type: "table",
        table_number: String(i + 1),
        active: true,
      }));

      const { data, error } = await (supabase as any)
        .from("qr_order_targets")
        .insert(rows)
        .select("*");

      if (error) throw error;

      setCodes(
        (data ?? []).map((r: any) => ({
          targetCode: r.target_code,
          targetType: r.target_type,
          tableNumber: r.table_number,
          url: buildQrEntryUrl(r.target_code),
        }))
      );

      toast.success(`${(data ?? []).length} QR codes created`);
    } catch (e: any) {
      toast.error(e?.message ?? "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-mobile-page bg-background text-foreground p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">QR Generator</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create QR codes for restaurant tables.
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
            placeholder="merchant_onboarding_profiles uuid"
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Number of tables
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
          {loading ? "Generating…" : "Generate QR codes"}
        </button>
      </div>

      {codes.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">
            {codes.length} QR Codes generated
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
