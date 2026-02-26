import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import { FileText, Download, Clock, ChevronRight, Globe, Building2, Scale, Home, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveTemplates, getAllTemplates } from "@/lib/templates/registry";
import type { DocumentTemplate } from "@/lib/templates/types";
import { generateFromTemplate, downloadPDF } from "@/lib/pdf-generator";

const categoryIcons: Record<string, typeof FileText> = {
  rental: Home, administrative: FileText, company: Building2, legal: Scale,
};
const categoryLabels: Record<string, string> = {
  rental: "Location", administrative: "Administratif", company: "Entreprise", legal: "Juridique",
};
const countryLabels: Record<string, string> = {
  FR: "🇫🇷 France", BE: "🇧🇪 Belgique", ES: "🇪🇸 Espagne", IT: "🇮🇹 Italie", DE: "🇩🇪 Allemagne",
};

interface DocRow {
  id: string;
  title: string;
  doc_type: string;
  template_id: string | null;
  template_version: string | null;
  data_json: Record<string, unknown>;
  pdf_url: string | null;
  created_at: string;
}

const Documents = () => {
  const [tab, setTab] = useState<"create" | "history" | "europe">("create");
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { orgId } = useAuth();

  const activeTemplates = getActiveTemplates("FR");
  const allTemplates = getAllTemplates();
  const europeTemplates = allTemplates.filter((t) => t.country !== "FR");

  const fetchDocs = async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("documents")
      .select("id, title, doc_type, template_id, template_version, data_json, pdf_url, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setDocs((data as DocRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [orgId]);

  const byCategory = activeTemplates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, DocumentTemplate[]>);

  const handleDownload = (d: DocRow) => {
    if (d.template_id) {
      const template = allTemplates.find((t) => t.id === d.template_id);
      if (template) {
        const doc = generateFromTemplate(template, d.data_json);
        downloadPDF(doc, `${d.title.replace(/\s/g, "_")}.pdf`);
      }
    }
  };

  if (selectedTemplate) {
    return (
      <DocumentBuilder
        template={selectedTemplate}
        onBack={() => setSelectedTemplate(null)}
        onGenerated={() => {
          setSelectedTemplate(null);
          setTab("history");
          fetchDocs();
        }}
      />
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Documents</h1>
        <p className="text-muted-foreground text-sm mb-6">Générez des documents conformes ou consultez votre historique.</p>

        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-8">
          {([
            { key: "create" as const, label: "Créer" },
            { key: "history" as const, label: `Historique (${docs.length})` },
            { key: "europe" as const, label: "🇪🇺 Europe" },
          ]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "create" && (
          <div className="space-y-8">
            {Object.entries(byCategory).map(([cat, templates]) => {
              const Icon = categoryIcons[cat] || FileText;
              return (
                <div key={cat}>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    {categoryLabels[cat] || cat}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {templates.map((t) => (
                      <button key={t.id} onClick={() => setSelectedTemplate(t)}
                        className="flex items-start gap-4 bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left group">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-gradient-gold transition-colors shrink-0">
                          <Icon className="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground text-sm">{t.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                          <div className="text-xs text-muted-foreground/60 mt-1">v{t.version}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 mt-1 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Chargement…</div>
            ) : docs.length === 0 ? (
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun document généré.</p>
              </div>
            ) : (
              docs.map((d) => (
                <div key={d.id} className="flex items-center gap-4 bg-card rounded-xl p-4 shadow-card border border-border/50">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{d.title}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(d.created_at).toLocaleDateString("fr-FR")}
                      <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{d.doc_type}</span>
                      {d.template_version && <span className="text-muted-foreground/60">v{d.template_version}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDownload(d)} className="text-muted-foreground hover:text-foreground transition-colors p-2">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "europe" && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-lg p-4">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Packs européens en préparation</p>
                <p className="text-xs text-muted-foreground">Ces modèles nécessitent une validation juridique avant utilisation.</p>
              </div>
            </div>
            {Object.entries(
              europeTemplates.reduce((acc, t) => {
                if (!acc[t.country]) acc[t.country] = [];
                acc[t.country].push(t);
                return acc;
              }, {} as Record<string, DocumentTemplate[]>)
            ).map(([country, templates]) => (
              <div key={country}>
                <h3 className="text-md font-semibold text-foreground mb-3">{countryLabels[country] || country}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templates.map((t) => (
                    <div key={t.id} className="flex items-start gap-4 bg-card rounded-xl p-5 shadow-card border border-border/50 opacity-60 cursor-default">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-sm">{t.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                        <span className="inline-block mt-1 text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">Révision juridique requise</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Documents;
