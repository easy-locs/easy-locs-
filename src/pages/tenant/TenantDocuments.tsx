import { useState, useEffect } from "react";
import { FileText, Upload, Loader2, CheckCircle, Clock, XCircle, Download } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DOC_TYPES = [
  { value: "id", label: "Pièce d'identité" },
  { value: "insurance", label: "Attestation d'assurance habitation" },
  { value: "income", label: "Justificatif de revenus" },
  { value: "tax", label: "Avis d'imposition" },
  { value: "other", label: "Autre document" },
];

interface TenantDoc {
  id: string;
  label: string;
  filename: string;
  file_url: string;
  status: string;
}

const getRentalDocPath = (fileUrl: string) => {
  if (!fileUrl) return "";
  if (!fileUrl.startsWith("http")) return fileUrl;
  const marker = "/rental-docs/";
  const markerIndex = fileUrl.indexOf(marker);
  if (markerIndex === -1) return fileUrl;
  return fileUrl.slice(markerIndex + marker.length).split("?")[0];
};

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
    case "validated":
      return <span className="flex items-center gap-1 text-xs text-success"><CheckCircle className="h-3 w-3" /> Validé</span>;
    case "rejected":
      return <span className="flex items-center gap-1 text-xs text-destructive"><XCircle className="h-3 w-3" /> Refusé</span>;
    default:
      return <span className="flex items-center gap-1 text-xs text-warning"><Clock className="h-3 w-3" /> En attente</span>;
  }
};

const TenantDocuments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<TenantDoc[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);
  const [docType, setDocType] = useState("id");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, org_id")
        .eq("tenant_user_id", user.id)
        .limit(1)
        .single();
      if (!tenant) { setLoading(false); return; }
      setTenantId(tenant.id);
      setOrgId(tenant.org_id);
      const { data } = await supabase
        .from("tenant_documents")
        .select("id, label, filename, file_url, status")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });
      setDocs((data as TenantDoc[]) || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const refreshDocs = async (targetTenantId: string) => {
    const { data } = await supabase
      .from("tenant_documents")
      .select("id, label, filename, file_url, status")
      .eq("tenant_id", targetTenantId)
      .order("created_at", { ascending: false });
    setDocs((data as TenantDoc[]) || []);
  };

  const openDocument = async (doc: TenantDoc) => {
    const path = getRentalDocPath(doc.file_url);
    if (!path) {
      toast({ title: "Erreur", description: "Chemin du document introuvable.", variant: "destructive" });
      return;
    }

    setOpeningDocId(doc.id);
    try {
      const { data, error } = await supabase.storage.from("rental-docs").createSignedUrl(path, 60 * 60);
      if (error || !data?.signedUrl) throw error || new Error("Lien sécurisé indisponible");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast({ title: "Impossible d'ouvrir le document", description: err.message, variant: "destructive" });
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
      toast({ title: "Erreur upload", description: upErr.message, variant: "destructive" });
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
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Document envoyé", description: "Votre bailleur sera notifié." });
      await refreshDocs(tenantId);
    }

    setUploading(false);
    e.target.value = "";
  };

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Mes documents</h1>
        <p className="text-muted-foreground mb-6">Envoyez vos justificatifs à votre bailleur.</p>

        {/* Upload area */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
          <h2 className="font-semibold text-foreground mb-4">Envoyer un document</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2.5 text-sm flex-1">
              {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <label className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity cursor-pointer text-sm">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Envoi..." : "Choisir un fichier"}
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png" />
            </label>
          </div>
        </div>

        {/* Documents list */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : docs.length === 0 ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun document envoyé.</p>
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
                    title="Ouvrir le document"
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

