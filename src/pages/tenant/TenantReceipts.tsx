import { useState, useEffect } from "react";
import { Receipt, Download, Loader2, CheckCircle } from "lucide-react";
import ReceiptStatusBadge from "@/components/rent/ReceiptStatusBadge";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import * as tenantRepo from "@/repositories/tenant-portal.repository";
import { useToast } from "@/hooks/use-toast";
import { useTenantProperty } from "@/hooks/useTenantProperty";

interface StorageFileRef {
  bucket: string;
  path: string;
}

const parseStorageFileRef = (fileUrl: string): StorageFileRef | null => {
  if (!fileUrl) return null;
  if (!fileUrl.startsWith("http")) return { bucket: "rental-docs", path: fileUrl };
  const cleanUrl = fileUrl.split("?")[0];
  const objectMatch = cleanUrl.match(/\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
  if (objectMatch) return { bucket: decodeURIComponent(objectMatch[1]), path: decodeURIComponent(objectMatch[2]) };
  const legacyMarker = "/rental-docs/";
  const markerIndex = cleanUrl.indexOf(legacyMarker);
  if (markerIndex >= 0) return { bucket: "rental-docs", path: cleanUrl.slice(markerIndex + legacyMarker.length) };
  return null;
};

const TenantReceipts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tenantId, L, fmt } = useTenantProperty();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const fetchReceipts = async () => {
      const data = await tenantRepo.fetchTenantReceipts(tenantId);
      setReceipts(data);
      setLoading(false);
    };
    fetchReceipts();
  }, [tenantId]);

  const handleDownload = async (r: any) => {
    setDownloadingId(r.id);
    try {
      const fileUrl = r.receipt_pdf_url;
      if (!fileUrl) throw new Error(L.noReceipt);
      const fileRef = parseStorageFileRef(fileUrl);
      if (!fileRef?.path) throw new Error(L.receiptDownloadError);
      let signedUrl: string | null = null;
      try {
        signedUrl = await tenantRepo.createSignedUrl(fileRef.bucket, fileRef.path, 60 * 60);
      } catch {
        if (fileRef.bucket !== "rental-docs") {
          signedUrl = await tenantRepo.createSignedUrl("rental-docs", fileRef.path, 60 * 60);
        }
      }
      if (!signedUrl) throw new Error(L.receiptDownloadError);
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error(L.receiptDownloadError);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${r.month}_${r.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: L.receiptDownloadError, description: err.message, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">{L.myReceipts}</h1>
        <p className="text-muted-foreground mb-6">{L.downloadReceipts}</p>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : receipts.length === 0 ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{L.noReceipt}</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border">
            {receipts.map((r) => (
              <div key={r.id} className="p-4">
                <div className="card-row">
                  <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                    <Receipt className="h-5 w-5 text-info" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground whitespace-nowrap">{r.month}</p>
                    <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-0.5">
                      <span>{L.rent}</span>
                      <span className="currency-value whitespace-nowrap">{fmt(r.rent_amount)}</span>
                      <span>+</span>
                      <span>{L.charges}</span>
                      <span className="currency-value whitespace-nowrap">{fmt(r.charges_amount)}</span>
                      <span>=</span>
                      <strong className="currency-value whitespace-nowrap">{fmt(r.total_amount)}</strong>
                    </p>
                    <ReceiptStatusBadge receiptUrl={r.receipt_pdf_url} validated={r.receipt_validated} paid={r.paid} />
                  </div>
                  {r.receipt_pdf_url && (
                    <button
                      onClick={() => handleDownload(r)}
                      disabled={downloadingId === r.id}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm text-accent hover:bg-accent/10 disabled:opacity-50"
                    >
                      {downloadingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TenantLayout>
  );
};

export default TenantReceipts;
