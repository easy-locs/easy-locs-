import { useState, useEffect } from "react";
import { Receipt, Download, Loader2 } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StorageFileRef {
  bucket: string;
  path: string;
}

const parseStorageFileRef = (fileUrl: string): StorageFileRef | null => {
  if (!fileUrl) return null;
  if (!fileUrl.startsWith("http")) {
    return { bucket: "rental-docs", path: fileUrl };
  }
  const cleanUrl = fileUrl.split("?")[0];
  const objectMatch = cleanUrl.match(/\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
  if (objectMatch) {
    return { bucket: decodeURIComponent(objectMatch[1]), path: decodeURIComponent(objectMatch[2]) };
  }
  const legacyMarker = "/rental-docs/";
  const markerIndex = cleanUrl.indexOf(legacyMarker);
  if (markerIndex >= 0) {
    return { bucket: "rental-docs", path: cleanUrl.slice(markerIndex + legacyMarker.length) };
  }
  return null;
};

const TenantReceipts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("tenant_user_id", user.id)
        .limit(1)
        .single();
      if (!tenant) { setLoading(false); return; }
      const { data } = await supabase
        .from("rent_calls")
        .select("id, month, rent_amount, charges_amount, total_amount, paid, receipt_pdf_url, receipt_validated")
        .eq("tenant_id", tenant.id)
        .eq("receipt_validated", true)
        .order("month", { ascending: false });
      setReceipts(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleDownload = async (r: any) => {
    setDownloadingId(r.id);
    try {
      const fileUrl = r.receipt_pdf_url;
      if (!fileUrl) throw new Error("Aucun fichier de quittance disponible.");

      const fileRef = parseStorageFileRef(fileUrl);
      if (!fileRef?.path) throw new Error("Chemin du fichier introuvable.");

      let signedUrl: string | null = null;
      const primary = await supabase.storage.from(fileRef.bucket).createSignedUrl(fileRef.path, 60 * 60);
      if (primary.data?.signedUrl) {
        signedUrl = primary.data.signedUrl;
      } else if (fileRef.bucket !== "rental-docs") {
        const fallback = await supabase.storage.from("rental-docs").createSignedUrl(fileRef.path, 60 * 60);
        signedUrl = fallback.data?.signedUrl ?? null;
      }

      if (!signedUrl) throw new Error("Impossible de générer un lien sécurisé.");
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const fmt = (n: number) => n?.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) ?? "—";

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Mes quittances</h1>
        <p className="text-muted-foreground mb-6">Téléchargez vos quittances de loyer validées par votre bailleur.</p>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : receipts.length === 0 ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucune quittance disponible pour le moment.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border">
            {receipts.map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                  <Receipt className="h-5 w-5 text-info" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{r.month}</p>
                  <p className="text-xs text-muted-foreground">Loyer {fmt(r.rent_amount)} + Charges {fmt(r.charges_amount)} = <strong>{fmt(r.total_amount)}</strong></p>
                </div>
                {r.receipt_pdf_url && (
                  <button
                    onClick={() => handleDownload(r)}
                    disabled={downloadingId === r.id}
                    className="flex items-center gap-1.5 text-sm text-accent hover:underline disabled:opacity-50"
                  >
                    {downloadingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </TenantLayout>
  );
};

export default TenantReceipts;
