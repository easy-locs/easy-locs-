import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addSupportEvidenceMeta, listSupportEvidence } from "@/lib/support/supportEvidence";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function SupportEvidencePanel({ ticketId }: { ticketId: string }) {
  const { user } = useAuth();
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: evidence = [], refetch, isLoading } = useQuery({
    queryKey: ["support-evidence", ticketId],
    enabled: !!ticketId,
    queryFn: () => listSupportEvidence(ticketId),
    staleTime: 5000,
  });

  const addEvidence = async () => {
    if (!fileName.trim() || !fileUrl.trim()) {
      toast.error("Enter file name and file URL");
      return;
    }
    try {
      setSaving(true);
      await addSupportEvidenceMeta({
        ticketId,
        fileName: fileName.trim(),
        fileUrl: fileUrl.trim(),
        uploadedByUserId: user?.id ?? null,
      });
      setFileName("");
      setFileUrl("");
      toast.success("Evidence added");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not add evidence");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-foreground">Evidence</h3>

      <div className="space-y-2">
        <input
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
          placeholder="File name"
        />
        <input
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
          placeholder="File URL"
        />
        <button
          onClick={addEvidence}
          disabled={saving}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add Evidence Link"}
        </button>
      </div>

      {isLoading && <div className="h-8 bg-muted animate-pulse rounded-xl" />}

      {!isLoading && evidence.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-4">
          No evidence added yet
        </div>
      )}

      {!isLoading && evidence.length > 0 && (
        <div className="space-y-2">
          {evidence.map((row: any) => (
            <a key={row.id} href={row.metadata?.fileUrl} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-border/20 bg-card p-3 hover:bg-muted/50 transition-colors">
              <p className="text-sm font-semibold text-foreground">{row.metadata?.fileName}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
