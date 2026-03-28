import { useState, useEffect } from "react";
import { FileText, Download, Mail, CheckCircle, Clock, Loader2, PenTool } from "lucide-react";
import * as docRepo from "@/repositories/documents.repository";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { format } from "date-fns";

interface DocRecord {
  id: string;
  title: string;
  doc_type: string;
  status: string;
  pdf_url: string | null;
  created_at: string;
  requires_signature: boolean;
  signed_by_owner_at: string | null;
  signed_by_tenant_at: string | null;
  emailed_at: string | null;
  country: string;
}

const DOC_TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  "rent-receipt": { icon: "🧾", label: "Quittance" },
  "lease": { icon: "📝", label: "Bail" },
  "payment-notice": { icon: "📬", label: "Avis d'échéance" },
  "inventory": { icon: "📋", label: "État des lieux" },
  "dunning": { icon: "⚠️", label: "Relance" },
  "termination": { icon: "📤", label: "Résiliation" },
  "formal-notice": { icon: "⚖️", label: "Mise en demeure" },
  "sworn-statement": { icon: "📜", label: "Attestation" },
  "other": { icon: "📄", label: "Autre" },
};

interface Props {
  propertyId?: string;
  tenantId?: string;
  showActions?: boolean;
}

const DocumentCenter = ({ propertyId, tenantId, showActions = true }: Props) => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    const fetchDocs = async () => {
      const data = await docRepo.fetchDocumentsForOrg(orgId);
      setDocs(data as DocRecord[]);
      setLoading(false);
    };
    fetchDocs();
  }, [orgId, propertyId]);

  const filteredDocs = filterType === "all" ? docs : docs.filter(d => d.doc_type === filterType);

  const openDocument = async (doc: DocRecord) => {
    if (!doc.pdf_url) {
      toast({ title: "Erreur", description: "Pas de PDF disponible", variant: "destructive" });
      return;
    }
    setOpeningId(doc.id);
    try {
      const signedUrl = await docRepo.createSignedUrl("rental-docs", doc.pdf_url, 3600);
      if (!signedUrl) {
        toast({ title: "Erreur", description: "Impossible d'ouvrir le document", variant: "destructive" });
        return;
      }

      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error("Téléchargement impossible");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${doc.title || "document"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ouvrir le document", variant: "destructive" });
    } finally {
      setOpeningId(null);
    }
  };

  const emailDocument = async (doc: DocRecord) => {
    if (!doc.pdf_url || !orgId) return;
    setSendingId(doc.id);
    try {
      const docData = await docRepo.fetchDocDataJson(doc.id);
      const tenantIdFromDoc = (docData?.data_json as any)?.tenant_id;
      if (!tenantIdFromDoc) {
        toast({ title: "Erreur", description: "Pas de locataire associé", variant: "destructive" });
        return;
      }

      const tenant = await docRepo.fetchTenantById(tenantIdFromDoc);
      if (!tenant?.email) {
        toast({ title: "Erreur", description: "Email du locataire non disponible", variant: "destructive" });
        return;
      }

      const signedUrl = await docRepo.createSignedUrl("rental-docs", doc.pdf_url!, 3600);

      await docRepo.sendEmailViaFunction({
        to: tenant.email,
        subject: `📎 ${doc.title}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
          <h2 style="color:#1a1a1a;text-align:center;">📎 ${doc.title}</h2>
          <p style="color:#555;font-size:15px;">Bonjour ${tenant.name},</p>
          <p style="color:#555;font-size:15px;">Vous trouverez ci-joint votre document : <strong>${doc.title}</strong>.</p>
          ${signedUrl ? `<div style="text-align:center;margin:24px 0;">
            <a href="${signedUrl}" style="display:inline-block;background:#d4a853;color:#1a1a1a;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;">📥 Télécharger le document</a>
          </div>` : ""}
          <p style="color:#888;font-size:12px;text-align:center;">E-mail envoyé automatiquement.</p>
        </div>`,
      });

      await docRepo.markDocumentEmailed(doc.id);
      await docRepo.insertAuditLog({
        user_id: user!.id, org_id: orgId, action: "document_emailed",
        metadata_json: { document_id: doc.id, doc_type: doc.doc_type, tenant_email: tenant.email },
      });

      if (tenantIdFromDoc && tenant.tenant_user_id) {
        await docRepo.insertNotification({
          user_id: tenant.tenant_user_id, scope: "global", category: "document",
          title: "📎 Nouveau document", body: `${doc.title} disponible`, severity: "info", route: "/tenant/documents",
        });
      }

      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, emailed_at: new Date().toISOString() } : d));
      toast({ title: "✅ Envoyé", description: `Document envoyé à ${tenant.email}` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSendingId(null);
    }
  };

  const getTypeInfo = (type: string) => DOC_TYPE_LABELS[type] || DOC_TYPE_LABELS.other;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue placeholder="Filtrer par type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📁 Tous les documents</SelectItem>
            {Object.entries(DOC_TYPE_LABELS).map(([key, { icon, label }]) => (
              <SelectItem key={key} value={key}>{icon} {label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs shrink-0">{filteredDocs.length} document(s)</Badge>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="bg-card rounded-xl p-12 border border-border/50 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm font-medium">Aucun document</p>
          <p className="text-xs text-muted-foreground mt-1">Les documents générés apparaîtront ici.</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2">
            {filteredDocs.map(doc => {
              const typeInfo = getTypeInfo(doc.doc_type);
              const isSigned = doc.signed_by_owner_at && doc.signed_by_tenant_at;
              const isPartialSigned = doc.signed_by_owner_at || doc.signed_by_tenant_at;
              return (
                <div key={doc.id} className="flex items-center gap-4 bg-card rounded-xl p-4 border border-border/50 hover:shadow-card-hover transition-all group">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-lg transition-colors ${
                    isSigned ? "bg-success/10" : isPartialSigned ? "bg-warning/10" : "bg-muted"
                  }`}>
                    {typeInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
                        {typeInfo.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(doc.created_at), "dd/MM/yyyy")}
                      </span>
                      {doc.emailed_at && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-success/10 text-[11px] font-medium text-success">
                          <Mail className="h-3 w-3" /> Envoyé
                        </span>
                      )}
                      {doc.requires_signature && (
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          isSigned ? "bg-success/10 text-success" :
                          isPartialSigned ? "bg-warning/10 text-warning" :
                          "bg-destructive/10 text-destructive"
                        }`}>
                          <PenTool className="h-3 w-3" />
                          {isSigned ? "Signé" :
                           doc.signed_by_owner_at ? "Bailleur ✓" :
                           doc.signed_by_tenant_at ? "Locataire ✓" : "À signer"}
                        </span>
                      )}
                    </div>
                  </div>
                  {showActions && (
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => openDocument(doc)}
                        disabled={!doc.pdf_url || openingId === doc.id}
                        title="Télécharger"
                      >
                        {openingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => emailDocument(doc)}
                        disabled={sendingId === doc.id}
                        title="Envoyer par email"
                      >
                        {sendingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default DocumentCenter;
