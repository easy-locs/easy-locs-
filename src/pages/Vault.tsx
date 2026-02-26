import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { FolderLock, Upload, Search, FileText, Trash2, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " o";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko";
  return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
}

interface VaultRow {
  id: string;
  filename: string;
  file_url: string;
  tags_json: string[];
  size: number;
  created_at: string;
}

const Vault = () => {
  const [search, setSearch] = useState("");
  const [files, setFiles] = useState<VaultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, orgId } = useAuth();
  const { toast } = useToast();

  const fetchFiles = async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("vault_files")
      .select("id, filename, file_url, tags_json, size, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setFiles((data as VaultRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, [orgId]);

  const filtered = files.filter((f) =>
    f.filename.toLowerCase().includes(search.toLowerCase()) ||
    (Array.isArray(f.tags_json) && f.tags_json.some((t: string) => t.toLowerCase().includes(search.toLowerCase())))
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !user || !orgId) return;
    setUploading(true);

    for (const file of Array.from(fileList)) {
      // Store as data URI for now (no storage bucket yet)
      const reader = new FileReader();
      reader.onload = async () => {
        const { error } = await supabase.from("vault_files").insert({
          org_id: orgId,
          user_id: user.id,
          filename: file.name,
          file_url: reader.result as string,
          tags_json: [file.type.split("/")[1] || "document"] as unknown as Json,
          size: file.size,
        });
        if (error) {
          toast({ title: "Erreur", description: error.message, variant: "destructive" });
        }
        fetchFiles();
      };
      reader.readAsDataURL(file);
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (id: string) => {
    await supabase.from("vault_files").delete().eq("id", id);
    fetchFiles();
  };

  const handleDownload = (file: VaultRow) => {
    if (file.file_url) {
      const link = document.createElement("a");
      link.href = file.file_url;
      link.download = file.filename;
      link.click();
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Coffre-fort</h1>
            <p className="text-muted-foreground text-sm mt-1">Stockez et classez vos documents en toute sécurité.</p>
          </div>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm disabled:opacity-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Importer
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un document…"
            className="w-full bg-card border border-border rounded-lg pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Chargement…</div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((file) => (
              <div key={file.id} className="flex items-center gap-4 bg-card rounded-xl p-4 shadow-card border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{file.filename}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(file.created_at).toLocaleDateString("fr-FR")}
                    <span>•</span>
                    <span>{formatFileSize(file.size)}</span>
                    {Array.isArray(file.tags_json) && file.tags_json.map((t: string) => (
                      <span key={t} className="bg-muted px-1.5 py-0.5 rounded text-xs">{t}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleDownload(file)} className="text-muted-foreground hover:text-foreground transition-colors p-2">
                  <Upload className="h-4 w-4 rotate-180" />
                </button>
                <button onClick={() => handleDelete(file.id)} className="text-muted-foreground hover:text-destructive transition-colors p-2">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-16 text-center">
            <FolderLock className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {search ? "Aucun résultat" : "Votre coffre-fort est vide"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {search ? "Essayez un autre terme de recherche." : "Importez vos premiers documents pour les classer automatiquement."}
            </p>
            {!search && (
              <button onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-6 py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm">
                <Upload className="h-4 w-4" /> Importer un document
              </button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Vault;
