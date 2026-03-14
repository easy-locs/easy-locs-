import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  FolderLock, Upload, Trash2, Download, FileText, Image,
  File, Loader2, Search, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface VaultFile {
  id: string;
  filename: string;
  file_url: string;
  size: number | null;
  tags_json: any;
  created_at: string;
}

const fmtSize = (bytes: number, locale: string = "fr") => {
  const isEn = locale === "en" || locale.startsWith("en");
  const mb = isEn ? "MB" : "Mo";
  const kb = isEn ? "KB" : "Ko";
  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} ${mb}` : `${(bytes / 1024).toFixed(0)} ${kb}`;
};

const fileIcon = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) return Image;
  if (["pdf"].includes(ext || "")) return FileText;
  return File;
};

const Vault = () => {
  const { user, orgId } = useAuth();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  const loadFiles = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("vault_files")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setFiles((data || []) as VaultFile[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !orgId || !user) return;
    setUploading(true);

    for (const file of Array.from(fileList)) {
      const path = `${orgId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("vault")
        .upload(path, file);

      if (uploadError) {
        toast({ title: t("page.vault.upload_error"), description: uploadError.message, variant: "destructive" });
        continue;
      }

      await supabase.from("vault_files").insert({
        org_id: orgId,
        user_id: user.id,
        filename: file.name,
        file_url: path,
        size: file.size,
      });
    }

    toast({ title: t("page.vault.uploaded") });
    await loadFiles();
    setUploading(false);
    e.target.value = "";
  };

  const handleDownload = async (file: VaultFile) => {
    const { data, error } = await supabase.storage
      .from("vault")
      .download(file.file_url);

    if (error || !data) {
      toast({ title: t("common.error"), description: t("page.vault.download_error"), variant: "destructive" });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (file: VaultFile) => {
    if (!confirm(`${t("page.vault.delete_confirm")} "${file.filename}" ?`)) return;

    await supabase.storage.from("vault").remove([file.file_url]);
    const { error } = await supabase.from("vault_files").delete().eq("id", file.id);
    if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("page.vault.deleted") });
    await loadFiles();
  };

  const filtered = files.filter(f =>
    !search || f.filename.toLowerCase().includes(search.toLowerCase())
  );

  const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="page-header mb-0">
            <h1 className="flex items-center gap-2">
              <FolderLock className="h-5 w-5 text-accent" />
              {t("page.vault.title")}
            </h1>
            <p>
              {files.length} {t("dashboard.files")} · {fmtSize(totalSize, locale)}
            </p>
          </div>
          <label className="btn-primary shrink-0 cursor-pointer">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? t("page.vault.uploading") : t("page.vault.add")}
            <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("page.vault.search")}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* File list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FolderLock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{search ? t("page.vault.empty_search") : t("page.vault.empty")}</p>
            <p className="text-sm mt-1">{t("page.vault.empty_hint")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((file) => {
              const Icon = fileIcon(file.filename);
              return (
                <div
                  key={file.id}
                  className="bg-card rounded-xl p-4 shadow-card border border-border/50 flex items-center gap-4 group hover:shadow-card-hover transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.size ? fmtSize(file.size, locale) : "—"} · {new Date(file.created_at).toLocaleDateString(locale === "en" ? "en-US" : locale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownload(file)}
                      className="text-muted-foreground hover:text-foreground"
                      title={t("page.vault.download")}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors"
                      title={t("page.vault.delete_confirm")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Vault;
