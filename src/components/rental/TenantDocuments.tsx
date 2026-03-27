import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { FileText, Upload, CheckCircle, Clock, XCircle, Trash2, Download, Mail, Loader2 } from "lucide-react";
import { buildAppUrl } from "@/lib/app-domain";

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

interface TenantContact {
  email: string | null;
  tenant_user_id: string | null;
}

/* ─── Utils ─── */
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

const normalizeStatus = (status: string) => {
  if (status === "approved") return "validated";
  return status || "pending";
};

const TenantDocuments = ({ tenantId, tenantName }: Props) => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [docs, setDocs] = useState<TenantDoc[]>([]);
  const [tenantContact, setTenantContact] = useState<TenantContact | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [requestingDocType, setRequestingDocType] = useState<string | null>(null);

  const DOC_TYPES = [
    { type: "id_card", label: t("comp.docs.doc_id_card") },
    { type: "insurance", label: t("comp.docs.doc_insurance") },
    { type: "income_proof", label: t("comp.docs.doc_income_proof") },
    { type: "rib", label: t("comp.docs.doc_rib") },
    { type: "guarantor", label: t("comp.docs.doc_guarantor") },
    { type: "contract", label: t("comp.docs.doc_contract") },
    { type: "tax_notice", label: t("comp.docs.doc_tax_notice") },
  ];

  const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
    pending: { label: t("comp.docs.status_pending"), icon: Clock, className: "text-warning bg-warning/10" },
    validated: { label: t("comp.docs.status_validated"), icon: CheckCircle, className: "text-success bg-success/10" },
    approved: { label: t("comp.docs.status_validated"), icon: CheckCircle, className: "text-success bg-success/10" },
    rejected: { label: t("comp.docs.status_rejected"), icon: XCircle, className: "text-destructive bg-destructive/10" },
  };

  const loadDocs = async () => {
    const { data } = await supabase.from("tenant_documents").select("id, doc_type, label, file_url, filename, status, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setDocs((data as TenantDoc[]) || []);
  };

  const loadTenantContact = async () => {
    const { data } = await supabase.from("tenants").select("email, tenant_user_id").eq("id", tenantId).single();
    setTenantContact((data as TenantContact) || null);
  };

  useEffect(() => { loadDocs(); loadTenantContact(); }, [tenantId]);

  const getSignedDocumentUrl = async (fileUrl: string) => {
    const fileRef = parseStorageFileRef(fileUrl);
    if (!fileRef?.path) return null;
    const primary = await supabase.storage.from(fileRef.bucket).createSignedUrl(fileRef.path, 60 * 60 * 24 * 7);
    if (primary.data?.signedUrl) return primary.data.signedUrl;
    if (fileRef.bucket !== "rental-docs") {
      const fallback = await supabase.storage.from("rental-docs").createSignedUrl(fileRef.path, 60 * 60 * 24 * 7);
      if (fallback.data?.signedUrl) return fallback.data.signedUrl;
      throw fallback.error || primary.error || new Error("Cannot generate signed URL");
    }
    throw primary.error || new Error("Cannot generate signed URL");
  };

  const openDocument = async (doc: TenantDoc) => {
    setOpeningDocId(doc.id);
    try {
      const signedUrl = await getSignedDocumentUrl(doc.file_url);
      if (!signedUrl) throw new Error("Document unavailable");

      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc.filename || `${doc.label}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: t("page.common.error"), description: err.message, variant: "destructive" });
    } finally {
      setOpeningDocId(null);
    }
  };

  const handleUpload = async (docType: string, label: string, file: File) => {
    if (!user || !orgId) return;
    setUploading(docType);
    try {
      const ext = file.name.split(".").pop();
      const path = `${orgId}/tenants/${tenantId}/${docType}_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("rental-docs").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { error: insertErr } = await supabase.from("tenant_documents").insert({ org_id: orgId, tenant_id: tenantId, doc_type: docType, label, file_url: path, filename: file.name, uploaded_by: user.id });
      if (insertErr) throw insertErr;
      toast({ title: `${label} ${t("comp.docs.uploaded")}` });
      await loadDocs();
    } catch (err: any) {
      toast({ title: t("page.common.error"), description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleValidate = async (docId: string, status: "validated" | "rejected") => {
    await supabase.from("tenant_documents").update({ status }).eq("id", docId);
    toast({ title: status === "validated" ? t("comp.docs.doc_validated") : t("comp.docs.doc_rejected") });
    await loadDocs();
  };

  const handleDelete = async (docId: string) => {
    const { error } = await supabase.from("tenant_documents").delete().eq("id", docId);
    if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("comp.docs.doc_deleted") });
    await loadDocs();
  };

  const handleRequestDocument = async (docType: string, label: string) => {
    if (!orgId || !user) return;
    setRequestingDocType(docType);
    try {
      const normalizedEmail = tenantContact?.email?.trim().toLowerCase() || null;
      const hasTenantAccount = !!tenantContact?.tenant_user_id;
      const hasValidEmail = !!normalizedEmail && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(normalizedEmail);

      const { error: msgError } = await supabase.from("messages").insert({ org_id: orgId, tenant_id: tenantId, sender_id: user.id, content: t("comp.docs.doc_requested_msg").replace("{label}", label), read: false });
      if (msgError) throw msgError;

      if (hasTenantAccount) {
        await (supabase as any).from("app_notifications").insert({ user_id: tenantContact!.tenant_user_id, scope: "global", category: "request", title: t("comp.docs.doc_requested_notif"), body: t("comp.docs.doc_requested_notif_msg").replace("{label}", label), severity: "info", route: "/tenant/documents" });
      }

      if (hasValidEmail) {
        const appUrl = buildAppUrl("/");
        const { data, error } = await supabase.functions.invoke("send-email", {
          body: {
            to: normalizedEmail,
            subject: `${t("comp.docs.doc_requested_notif")} : ${label}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
              <h2 style="color:#1a1a1a;text-align:center;">${t("comp.docs.email_heading")}</h2>
              <p style="color:#555;font-size:15px;">Bonjour ${tenantName},</p>
              <p style="color:#555;font-size:15px;">${t("comp.docs.email_body")}</p>
              <div style="background:#f5f5f5;border-left:4px solid #d4a853;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="color:#1a1a1a;margin:0;font-size:15px;font-weight:600;">${label}</p>
              </div>
              <div style="text-align:center;margin:24px 0;">
                <a href="${appUrl}/tenant/documents" style="display:inline-block;background:#d4a853;color:#1a1a1a;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;">${t("comp.docs.email_cta")}</a>
              </div>
              <p style="color:#888;font-size:12px;text-align:center;">${t("hook.rental.receipt_email_footer")}</p>
            </div>`,
          },
        });
        if (error || (data && data.success === false)) throw error || new Error(data?.error || "Send failed");
      }

      if (!hasTenantAccount && !hasValidEmail) {
        throw new Error(t("comp.docs.no_tenant_contact"));
      }

      toast({ title: t("comp.docs.request_sent"), description: t("comp.docs.request_sent_desc").replace("{label}", label) });
    } catch (err: any) {
      toast({ title: t("page.common.error"), description: err.message, variant: "destructive" });
    } finally {
      setRequestingDocType(null);
    }
  };

  const handleSendAllByEmail = async () => {
    if (docs.length === 0) return;
    setSendingEmail(true);
    try {
      const tenantEmail = tenantContact?.email;
      if (!tenantEmail) throw new Error(t("comp.docs.no_tenant_email"));

      const appUrl = buildAppUrl("/");
      const docsWithLinks = await Promise.all(
        docs.map(async (d) => ({ ...d, accessUrl: await getSignedDocumentUrl(d.file_url), statusLabel: statusConfig[normalizeStatus(d.status)]?.label || d.status }))
      );

      const docListHtml = docsWithLinks.map((d) => `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;">${d.label}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;">${d.filename}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;">${d.statusLabel}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;"><a href="${d.accessUrl}" style="color:#d4a853;text-decoration:underline;">Download</a></td>
        </tr>`).join("");

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: tenantEmail,
          subject: t("comp.docs.email_docs_subject"),
          html: `<div style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:24px;background:#ffffff;">
            <h2 style="color:#1a1a1a;text-align:center;">${t("comp.docs.email_docs_heading")}</h2>
            <p style="color:#555;font-size:15px;">Bonjour ${tenantName},</p>
            <p style="color:#555;font-size:15px;">${t("comp.docs.email_docs_body")}</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;"><thead><tr style="background:#f5f5f5;"><th style="padding:8px 12px;text-align:left;font-size:13px;color:#888;">Type</th><th style="padding:8px 12px;text-align:left;font-size:13px;color:#888;">File</th><th style="padding:8px 12px;text-align:left;font-size:13px;color:#888;">Status</th><th style="padding:8px 12px;text-align:left;font-size:13px;color:#888;">Link</th></tr></thead><tbody>${docListHtml}</tbody></table>
            <div style="text-align:center;margin:24px 0;">
              <a href="${appUrl}/tenant/documents" style="display:inline-block;background:#d4a853;color:#1a1a1a;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;">${t("comp.docs.email_docs_cta")}</a>
            </div>
            <p style="color:#888;font-size:12px;text-align:center;">${t("hook.rental.receipt_email_footer")}</p>
          </div>`,
        },
      });
      if (error || (data && data.success === false)) throw error || new Error(data?.error || "Send failed");
      toast({ title: t("comp.docs.email_sent"), description: t("comp.docs.email_sent_desc").replace("{email}", tenantEmail) });
    } catch (err: any) {
      toast({ title: t("comp.docs.send_error"), description: err.message, variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">{t("comp.docs.documents_title")} — {tenantName}</h3>
        {docs.length > 0 && (
          <button onClick={handleSendAllByEmail} disabled={sendingEmail} className="flex items-center gap-2 text-sm font-medium bg-gradient-gold text-accent-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity">
            {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {sendingEmail ? t("comp.docs.sending") : t("comp.docs.send_email")}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {DOC_TYPES.map(dt => {
          const existing = docs.filter(d => d.doc_type === dt.type);
          const status = existing.length > 0 ? normalizeStatus(existing[0].status) : null;
          const sc = status ? statusConfig[status] : null;

          return (
            <div key={dt.type} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm text-foreground block">{dt.label}</span>
                  {existing.length > 0 && <span className="text-xs text-muted-foreground">{existing[0].filename}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {sc && (
                  <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${sc.className}`}>
                    <sc.icon className="h-3 w-3" />{sc.label}
                  </span>
                )}
                <button onClick={() => handleRequestDocument(dt.type, dt.label)} disabled={requestingDocType === dt.type} className="text-xs text-accent hover:underline disabled:opacity-50">
                  {requestingDocType === dt.type ? t("comp.docs.sending") : t("comp.docs.request")}
                </button>
                {existing.length > 0 && status === "pending" && (
                  <>
                    <button onClick={() => handleValidate(existing[0].id, "validated")} className="text-xs text-success hover:underline">{t("comp.docs.validate")}</button>
                    <button onClick={() => handleValidate(existing[0].id, "rejected")} className="text-xs text-destructive hover:underline">{t("comp.docs.reject")}</button>
                  </>
                )}
                {existing.length > 0 && (
                  <>
                    <button onClick={() => openDocument(existing[0])} disabled={openingDocId === existing[0].id} className="text-muted-foreground hover:text-foreground p-1 disabled:opacity-40">
                      {openingDocId === existing[0].id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => handleDelete(existing[0].id)} className="text-muted-foreground/40 hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                  </>
                )}
                {existing.length === 0 && (
                  <label className="flex items-center gap-1 text-xs text-accent cursor-pointer hover:underline">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading === dt.type ? t("comp.docs.uploading") : t("comp.docs.add")}
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => { if (e.target.files?.[0]) handleUpload(dt.type, dt.label, e.target.files[0]); }} />
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
