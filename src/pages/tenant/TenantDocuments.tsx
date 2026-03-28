import { useState, useEffect } from "react";
import { FileText, Upload, Loader2, CheckCircle, Clock, XCircle, Download, Filter, PenTool } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import * as tenantRepo from "@/repositories/tenant-portal.repository";
import { useToast } from "@/hooks/use-toast";
import { useTenantProperty } from "@/hooks/useTenantProperty";
import { useLeaseWorkflow } from "@/hooks/useLeaseWorkflow";
import SignatureDialog from "@/components/documents/SignatureDialog";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ── Types ── */
interface TenantDoc {
  id: string;
  label: string;
  filename: string;
  file_url: string;
  status: string;
}

interface LandlordDoc {
  id: string;
  title: string;
  doc_type: string;
  status: string;
  pdf_url: string | null;
  created_at: string;
  requires_signature: boolean | null;
  signed_by_owner_at: string | null;
  signed_by_tenant_at: string | null;
  emailed_at: string | null;
}

/* ── Storage helpers ── */
interface StorageFileRef { bucket: string; path: string; }

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

/* ── Doc type config ── */
const DOC_TYPE_INFO: Record<string, { icon: string; label: string; color: string }> = {
  "rent-receipt": { icon: "🧾", label: "Quittance", color: "bg-success/10 text-success" },
  "lease": { icon: "📝", label: "Bail", color: "bg-primary/10 text-primary" },
  "payment-notice": { icon: "📬", label: "Avis d'échéance", color: "bg-warning/10 text-warning" },
  "inventory": { icon: "📋", label: "État des lieux", color: "bg-accent/10 text-accent-foreground" },
  "dunning": { icon: "⚠️", label: "Relance", color: "bg-destructive/10 text-destructive" },
  "termination": { icon: "📤", label: "Résiliation", color: "bg-muted text-muted-foreground" },
  "sworn-statement": { icon: "📜", label: "Attestation", color: "bg-primary/10 text-primary" },
  "other": { icon: "📄", label: "Document", color: "bg-muted text-muted-foreground" },
};

const TenantDocuments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tenantId, orgId, propertyId, T } = useTenantProperty();
  const { recordTenantSignature } = useLeaseWorkflow();

  /* My uploads */
  const [myDocs, setMyDocs] = useState<TenantDoc[]>([]);
  /* Docs from landlord */
  const [landlordDocs, setLandlordDocs] = useState<LandlordDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [docType, setDocType] = useState("id");
  const [filterType, setFilterType] = useState("all");
  const [signDocId, setSignDocId] = useState<string | null>(null);
  const [signDocTitle, setSignDocTitle] = useState("");

  const DOC_TYPES = [
    { value: "id", label: T.docTypeId },
    { value: "insurance", label: T.docTypeInsurance },
    { value: "income", label: T.docTypeIncome },
    { value: "tax", label: T.docTypeTax },
    { value: "other", label: T.docTypeOther },
  ];

  /* ── Fetch all docs ── */
  useEffect(() => {
    if (!tenantId || !orgId) { if (!loading) return; return; }

    const fetchAll = async () => {
      // 1. Tenant-uploaded docs
      const { data: uploaded } = await supabase
        .from("tenant_documents")
        .select("id, label, filename, file_url, status")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      // 2. Landlord-generated docs (receipts, leases, notices, etc.)
      const { data: generated } = await supabase
        .from("documents")
        .select("id, title, doc_type, status, pdf_url, created_at, requires_signature, signed_by_owner_at, signed_by_tenant_at, emailed_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      // Filter landlord docs linked to this tenant (via data_json.tenant_id or data_json.property_id)
      // Since we can't filter jsonb easily in query, we fetch and filter
      // For now, show all org docs that have been emailed or are receipts/leases
      const relevantTypes = ["rent-receipt", "lease", "payment-notice", "inventory", "dunning", "termination", "sworn-statement"];
      const filtered = (generated || []).filter((d: any) =>
        relevantTypes.includes(d.doc_type) && (d.status === "generated" || d.status === "signed" || d.status === "pending_signature" || d.emailed_at)
      );

      setMyDocs((uploaded as TenantDoc[]) || []);
      setLandlordDocs(filtered as LandlordDoc[]);
      setLoading(false);
    };

    fetchAll();
  }, [tenantId, orgId]);

  /* ── Status badge ── */
  const statusBadge = (status: string) => {
    const base = "inline-flex items-center justify-center gap-1 whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium";
    switch (status) {
      case "approved": case "validated": case "signed":
        return <span className={`${base} bg-success/10 text-success`}><CheckCircle className="h-3 w-3" /> {T.statusApproved}</span>;
      case "rejected":
        return <span className={`${base} bg-destructive/10 text-destructive`}><XCircle className="h-3 w-3" /> {T.statusRejected}</span>;
      default:
        return <span className={`${base} bg-warning/10 text-warning`}><Clock className="h-3 w-3" /> {T.statusPending}</span>;
    }
  };

  /* ── Download tenant doc ── */
  const openTenantDoc = async (doc: TenantDoc) => {
    const fileRef = parseStorageFileRef(doc.file_url);
    if (!fileRef?.path) {
      toast({ title: T.error, description: T.docPathError, variant: "destructive" });
      return;
    }
    setOpeningId(doc.id);
    try {
      let signedUrl: string | null = null;
      try {
        signedUrl = await tenantRepo.createSignedUrl(fileRef.bucket, fileRef.path, 3600);
      } catch {
        if (fileRef.bucket !== "rental-docs") {
          signedUrl = await tenantRepo.createSignedUrl("rental-docs", fileRef.path, 3600);
        }
      }
      if (!signedUrl) throw primary.error || new Error(T.linkUnavailable);
      downloadFile(signedUrl, doc.filename || `${doc.label}.pdf`);
    } catch (err: any) {
      toast({ title: T.cannotOpenDoc, description: err.message, variant: "destructive" });
    } finally {
      setOpeningId(null);
    }
  };

  /* ── Download landlord doc ── */
  const openLandlordDoc = async (doc: LandlordDoc) => {
    if (!doc.pdf_url) {
      toast({ title: T.error, description: T.linkUnavailable, variant: "destructive" });
      return;
    }
    setOpeningId(doc.id);
    try {
      const signedUrl = await tenantRepo.createSignedUrl("rental-docs", doc.pdf_url, 3600);
      if (!signedUrl) throw new Error(T.linkUnavailable);
      downloadFile(signedUrl, `${doc.title || "document"}.pdf`);
    } catch (err: any) {
      toast({ title: T.cannotOpenDoc, description: err.message, variant: "destructive" });
    } finally {
      setOpeningId(null);
    }
  };

  const downloadFile = async (url: string, filename: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(T.linkUnavailable);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(blobUrl);
  };

  /* ── Upload ── */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !tenantId || !orgId) return;
    setUploading(true);
    const path = `${orgId}/${tenantId}/${Date.now()}_${file.name}`;
    try {
      await tenantRepo.uploadTenantDoc(tenantId, orgId, user.id, file, docType, DOC_TYPES.find(d => d.value === docType)?.label || docType);
      toast({ title: T.docSent, description: T.docSentDesc });
      const data = await tenantRepo.fetchTenantUploadedDocs(tenantId);
      setMyDocs((data as TenantDoc[]) || []);
    } catch (err: any) {
      toast({ title: T.error, description: err.message, variant: "destructive" });
    }
    setUploading(false);
    e.target.value = "";
  };

  /* ── Filter landlord docs ── */
  const filteredLandlordDocs = filterType === "all"
    ? landlordDocs
    : landlordDocs.filter(d => d.doc_type === filterType);

  const getTypeInfo = (type: string) => DOC_TYPE_INFO[type] || DOC_TYPE_INFO.other;

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">{T.docsTitle}</h1>
        <p className="text-muted-foreground mb-6">{T.docsSubtitle}</p>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs defaultValue="received" className="space-y-4">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="received" className="gap-1.5">
                <FileText className="h-4 w-4" />
                Reçus
                {landlordDocs.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 text-xs px-1.5">{landlordDocs.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="gap-1.5">
                <Upload className="h-4 w-4" />
                Envoyés
                {myDocs.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 text-xs px-1.5">{myDocs.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Tab: Received from landlord ── */}
            <TabsContent value="received" className="space-y-4">
              {/* Filter chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                {[
                  { key: "all", label: "Tous" },
                  { key: "rent-receipt", label: "🧾 Quittances" },
                  { key: "lease", label: "📝 Baux" },
                  { key: "payment-notice", label: "📬 Avis" },
                  { key: "inventory", label: "📋 États des lieux" },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilterType(f.key)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      filterType === f.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredLandlordDocs.length === 0 ? (
                <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Aucun document reçu</p>
                  <p className="text-xs text-muted-foreground mt-1">Les quittances, baux et avis d'échéance apparaîtront ici.</p>
                </div>
              ) : (
                <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border">
                  {filteredLandlordDocs.map(doc => {
                    const info = getTypeInfo(doc.doc_type);
                    const needsSign = doc.requires_signature && !doc.signed_by_tenant_at;
                    return (
                      <div key={doc.id} className="p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg ${info.color}`}>
                            {info.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-muted-foreground">{info.label}</span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "dd/MM/yyyy")}</span>
                              {doc.requires_signature && (
                                <>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className={`text-xs ${doc.signed_by_owner_at && doc.signed_by_tenant_at ? "text-success" : "text-warning"}`}>
                                    {doc.signed_by_owner_at && doc.signed_by_tenant_at ? "✅ Signé" :
                                     doc.signed_by_tenant_at ? "⏳ En attente bailleur" :
                                     "✍️ À signer"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Sign button for tenant */}
                            {needsSign && (
                              <button
                                onClick={() => { setSignDocId(doc.id); setSignDocTitle(doc.title); }}
                                className="inline-flex items-center gap-1 text-xs font-medium bg-accent text-accent-foreground px-2.5 py-1.5 rounded-md hover:opacity-90 transition-opacity"
                              >
                                <PenTool className="h-3 w-3" /> Signer
                              </button>
                            )}
                            <button
                              onClick={() => openLandlordDoc(doc)}
                              disabled={!doc.pdf_url || openingId === doc.id}
                              className="text-muted-foreground hover:text-foreground p-2 disabled:opacity-50"
                              title={T.openDoc}
                            >
                              {openingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tenant signature dialog */}
              {signDocId && (
                <SignatureDialog
                  open={!!signDocId}
                  onOpenChange={(open) => { if (!open) setSignDocId(null); }}
                  documentId={signDocId}
                  documentTitle={signDocTitle}
                  signerRole="tenant"
                  onSigned={async () => {
                    const doc = landlordDocs.find(d => d.id === signDocId);
                    if (doc) {
                      const { data: docData } = await supabase.from("documents").select("lease_id").eq("id", signDocId).single();
                      if ((docData as any)?.lease_id) {
                        await recordTenantSignature((docData as any).lease_id);
                      }
                    }
                    const { data: generated } = await supabase
                      .from("documents")
                      .select("id, title, doc_type, status, pdf_url, created_at, requires_signature, signed_by_owner_at, signed_by_tenant_at, emailed_at")
                      .eq("org_id", orgId!)
                      .order("created_at", { ascending: false });
                    const relevantTypes = ["rent-receipt", "lease", "payment-notice", "inventory", "dunning", "termination", "sworn-statement"];
                    const filtered = (generated || []).filter((d: any) =>
                      relevantTypes.includes(d.doc_type) && (d.status === "generated" || d.status === "signed" || d.status === "pending_signature" || d.emailed_at)
                    );
                    setLandlordDocs(filtered as LandlordDoc[]);
                  }}
                />
              )}
            </TabsContent>

            {/* ── Tab: Sent by tenant ── */}
            <TabsContent value="sent" className="space-y-4">
              {/* Upload form */}
              <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                <h2 className="font-semibold text-foreground mb-3 text-sm">{T.sendDocument}</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select value={docType} onChange={(e) => setDocType(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-2.5 text-sm flex-1">
                    {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  <label className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity cursor-pointer text-sm">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? T.uploading : T.chooseFile}
                    <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png" />
                  </label>
                </div>
              </div>

              {myDocs.length === 0 ? (
                <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">{T.noDocSent}</p>
                </div>
              ) : (
                <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border">
                  {myDocs.map(d => (
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
                          onClick={() => openTenantDoc(d)}
                          disabled={openingId === d.id}
                          className="text-muted-foreground hover:text-foreground p-1 disabled:opacity-50"
                          title={T.openDoc}
                        >
                          {openingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </TenantLayout>
  );
};

export default TenantDocuments;
