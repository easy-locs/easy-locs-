import { useState, useEffect } from "react";
import { FileText, Upload, Loader2, CheckCircle, Clock, XCircle, Download } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenantProperty } from "@/hooks/useTenantProperty";

interface TenantDoc {
  id: string;
  label: string;
  filename: string;
  file_url: string;
  status: string;
}

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

const TenantDocuments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tenantId, orgId, T } = useTenantProperty();
  const [docs, setDocs] = useState<TenantDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);
  const [docType, setDocType] = useState("id");

  const DOC_TYPES = [
    { value: "id", label: T.docTypeId },
    { value: "insurance", label: T.docTypeInsurance },
    { value: "income", label: T.docTypeIncome },
    { value: "tax", label: T.docTypeTax },
    { value: "other", label: T.docTypeOther },
  ];

  const statusBadge = (status: string) => {
    const base = "inline-flex items-center justify-center gap-1 whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium";
    switch (status) {
      case "approved":
      case "validated":
        return <span className={`${base} bg-success/10 text-success`}><CheckCircle className="h-3 w-3" /> {T.statusApproved}</span>;
      case "rejected":
        return <span className={`${base} bg-destructive/10 text-destructive`}><XCircle className="h-3 w-3" /> {T.statusRejected}</span>;
      default:
        return <span className={`${base} bg-warning/10 text-warning`}><Clock className="h-3 w-3" /> {T.statusPending}</span>;
    }
  };

  useEffect(() => {
    if (!tenantId) { if (!loading) return; return; }
    const fetch = async () => {
      const { data } = await supabase
        .from("tenant_documents")
        .select("id, label, filename, file_url, status")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      setDocs((data as TenantDoc[]) || []);
      setLoading(false);
    };
    fetch();
  }, [tenantId]);

  const refreshDocs = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("tenant_documents")
      .select("id, label, filename, file_url, status")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    setDocs((data as TenantDoc[]) || []);
  };

  const openDocument = async (doc: TenantDoc) => {
    const fileRef = parseStorageFileRef(doc.file_url);
    if (!fileRef?.path) {
      toast({ title: T.error, description: T.docPathError, variant: "destructive" });
      return;
    }
    setOpeningDocId(doc.id);
    try {
      let signedUrl: string | null = null;
      const primary = await supabase.storage.from(fileRef.bucket).createSignedUrl(fileRef.path, 60 * 60);
      if (primary.data?.signedUrl) {
        signedUrl = primary.data.signedUrl;
      } else if (fileRef.bucket !== "rental-docs") {
        const fallback = await supabase.storage.from("rental-docs").createSignedUrl(fileRef.path, 60 * 60);
        signedUrl = fallback.data?.signedUrl ?? null;
      }
      if (!signedUrl) throw primary.error || new Error(T.linkUnavailable);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast({ title: T.cannotOpenDoc, description: err.message, variant: "destructive" });
    } finally {
      setOpeningDocId(null);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !tenantId || !orgId) return;
    setUploading(true);
    const path = `${orgId}/${tenantId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("rental-docs").upload(path, file);
    if (upErr) {
      toast({ title: T.error, description: upErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const label = DOC_TYPES.find(d => d.value === docType)?.label || docType;
    const { error } = await supabase.from("tenant_documents").insert({
      tenant_id: tenantId,
      org_id: orgId,
      uploaded_by: user.id,
      doc_type: docType,
      label,
      filename: file.name,
      file_url: path,
    });
    if (error) {
      toast({ title: T.error, description: error.message, variant: "destructive" });
    } else {
      toast({ title: T.docSent, description: T.docSentDesc });
      await refreshDocs();
    }
    setUploading(false);
    e.target.value = "";
  };

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">{T.docsTitle}</h1>
        <p className="text-muted-foreground mb-6">{T.docsSubtitle}</p>

        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
          <h2 className="font-semibold text-foreground mb-4">{T.sendDocument}</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2.5 text-sm flex-1">
              {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <label className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity cursor-pointer text-sm">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? T.uploading : T.chooseFile}
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png" />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : docs.length === 0 ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{T.noDocSent}</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{d.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.filename}</p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(d.status)}
                  <button
                    onClick={() => openDocument(d)}
                    disabled={openingDocId === d.id}
                    className="text-muted-foreground hover:text-foreground p-1 disabled:opacity-50"
                    title={T.openDoc}
                  >
                    {openingDocId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TenantLayout>
  );
};

export default TenantDocuments;
