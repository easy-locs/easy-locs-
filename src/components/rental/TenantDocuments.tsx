import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, CheckCircle, Clock, XCircle, Trash2, Download, Mail, Loader2 } from "lucide-react";

interface Props {
  tenantId: string;
  tenantName: string;
}

interface TenantDoc {
  id: string;
  doc_type: string;
  label: string;
  file_url: string;
  filename: string;
  status: string;
  created_at: string;
}

const DOC_TYPES = [
  { type: "id_card", label: "Pièce d'identité" },
  { type: "insurance", label: "Attestation d'assurance habitation" },
  { type: "income_proof", label: "Justificatif de revenus (3 derniers mois)" },
  { type: "rib", label: "RIB" },
  { type: "guarantor", label: "Caution solidaire" },
  { type: "contract", label: "Contrat de travail / attestation employeur" },
  { type: "tax_notice", label: "Avis d'imposition" },
];

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "En attente", icon: Clock, className: "text-yellow-600 bg-yellow-500/20" },
  validated: { label: "Validé", icon: CheckCircle, className: "text-green-600 bg-green-500/20" },
  rejected: { label: "Rejeté", icon: XCircle, className: "text-red-600 bg-red-500/20" },
};

const TenantDocuments = ({ tenantId, tenantName }: Props) => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<TenantDoc[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const loadDocs = async () => {
    const { data } = await supabase
      .from("tenant_documents")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    setDocs((data as TenantDoc[]) || []);
  };

  useEffect(() => { loadDocs(); }, [tenantId]);

  const handleUpload = async (docType: string, label: string, file: File) => {
    if (!user || !orgId) return;
    setUploading(docType);
    try {
      const ext = file.name.split(".").pop();
      const path = `${orgId}/tenants/${tenantId}/${docType}_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("rental-docs").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("rental-docs").getPublicUrl(path);

      const { error: insertErr } = await supabase.from("tenant_documents").insert({
        org_id: orgId,
        tenant_id: tenantId,
        doc_type: docType,
        label,
        file_url: urlData.publicUrl,
        filename: file.name,
        uploaded_by: user.id,
      });
      if (insertErr) throw insertErr;

      toast({ title: `${label} uploadé` });
      await loadDocs();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleValidate = async (docId: string, status: "validated" | "rejected") => {
    await supabase.from("tenant_documents").update({ status }).eq("id", docId);
    toast({ title: status === "validated" ? "Document validé" : "Document rejeté" });
    await loadDocs();
  };

  const handleDelete = async (docId: string) => {
    await supabase.from("tenant_documents").delete().eq("id", docId);
    toast({ title: "Document supprimé" });
    await loadDocs();
  };

  const handleSendAllByEmail = async () => {
    if (!orgId || docs.length === 0) return;
    setSendingEmail(true);
    try {
      // Get tenant email
      const { data: tenant } = await supabase
        .from("tenants")
        .select("email")
        .eq("id", tenantId)
        .single();

      if (!tenant?.email) {
        toast({ title: "Erreur", description: "Ce locataire n'a pas d'adresse email configurée.", variant: "destructive" });
        setSendingEmail(false);
        return;
      }

      const appUrl = window.location.origin;
      const docListHtml = docs.map(d => {
        const sc = statusConfig[d.status];
        const statusLabel = sc ? sc.label : d.status;
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;">${d.label}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;">${d.filename}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;">${statusLabel}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;"><a href="${d.file_url}" style="color:#d4a853;text-decoration:underline;">Télécharger</a></td>
        </tr>`;
      }).join("");

      await supabase.functions.invoke("send-email", {
        body: {
          to: tenant.email,
          subject: `Vos documents — Easy-Locs`,
          html: `<div style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:24px;background:#ffffff;">
            <h2 style="color:#1a1a1a;text-align:center;">📄 Vos documents locataire</h2>
            <p style="color:#555;font-size:15px;">Bonjour ${tenantName},</p>
            <p style="color:#555;font-size:15px;">Voici le récapitulatif de vos documents :</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <thead>
                <tr style="background:#f5f5f5;">
                  <th style="padding:8px 12px;text-align:left;font-size:13px;color:#888;">Type</th>
                  <th style="padding:8px 12px;text-align:left;font-size:13px;color:#888;">Fichier</th>
                  <th style="padding:8px 12px;text-align:left;font-size:13px;color:#888;">Statut</th>
                  <th style="padding:8px 12px;text-align:left;font-size:13px;color:#888;">Lien</th>
                </tr>
              </thead>
              <tbody>${docListHtml}</tbody>
            </table>
            <div style="text-align:center;margin:24px 0;">
              <a href="${appUrl}/tenant/documents" style="display:inline-block;background:#d4a853;color:#1a1a1a;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;">Accéder à mes documents</a>
            </div>
            <p style="color:#888;font-size:12px;text-align:center;">Cet email est envoyé automatiquement par Easy-Locs.</p>
          </div>`,
        },
      });

      toast({ title: "Email envoyé", description: `Récapitulatif des documents envoyé à ${tenant.email}` });
    } catch (err: any) {
      toast({ title: "Erreur d'envoi", description: err.message, variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Documents du locataire — {tenantName}</h3>
        {docs.length > 0 && (
          <button
            onClick={handleSendAllByEmail}
            disabled={sendingEmail}
            className="flex items-center gap-2 text-sm font-medium bg-gradient-gold text-accent-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {sendingEmail ? "Envoi…" : "Envoyer par email"}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {DOC_TYPES.map(dt => {
          const existing = docs.filter(d => d.doc_type === dt.type);
          const status = existing.length > 0 ? existing[0].status : null;
          const sc = status ? statusConfig[status] : null;

          return (
            <div key={dt.type} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm text-foreground block">{dt.label}</span>
                  {existing.length > 0 && (
                    <span className="text-xs text-muted-foreground">{existing[0].filename}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {sc && (
                  <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${sc.className}`}>
                    <sc.icon className="h-3 w-3" />{sc.label}
                  </span>
                )}

                {existing.length > 0 && status === "pending" && (
                  <>
                    <button onClick={() => handleValidate(existing[0].id, "validated")}
                      className="text-xs text-green-600 hover:underline">Valider</button>
                    <button onClick={() => handleValidate(existing[0].id, "rejected")}
                      className="text-xs text-red-600 hover:underline">Rejeter</button>
                  </>
                )}

                {existing.length > 0 && (
                  <>
                    <a href={existing[0].file_url} target="_blank" rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground p-1">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    <button onClick={() => handleDelete(existing[0].id)}
                      className="text-muted-foreground/40 hover:text-destructive p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}

                {existing.length === 0 && (
                  <label className="flex items-center gap-1 text-xs text-accent cursor-pointer hover:underline">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading === dt.type ? "Upload…" : "Ajouter"}
                    <input type="file" className="hidden" accept="image/*,.pdf"
                      onChange={e => { if (e.target.files?.[0]) handleUpload(dt.type, dt.label, e.target.files[0]); }} />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TenantDocuments;
