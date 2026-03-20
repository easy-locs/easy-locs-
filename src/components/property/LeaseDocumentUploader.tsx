import { useState } from "react";
import { useLeaseDocumentsStore } from "@/stores/leaseDocumentsStore";

export function LeaseDocumentUploader(props: { leaseId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const uploadLeaseDocument = useLeaseDocumentsStore((s) => s.uploadLeaseDocument);
  const uploading = useLeaseDocumentsStore((s) => s.uploading);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Upload Lease Document</h3>
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        className="text-xs text-muted-foreground"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button
        disabled={!file || uploading}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        onClick={async () => {
          if (!file) return;
          await uploadLeaseDocument(props.leaseId, file);
          setFile(null);
        }}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}
