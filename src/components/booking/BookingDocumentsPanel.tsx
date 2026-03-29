/**
 * BookingDocumentsPanel — Reusable document upload/view panel for any booking type.
 * Works with both seasonal booking_requests and concierge_orders.
 */
import { useState, useCallback } from "react";
import { uploadBookingDocumentFile, getBookingDocumentPublicUrl, updateDocumentUrls } from "@/repositories/rental.repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, Upload, Eye, Trash2, Search } from "lucide-react";

interface BookingDocumentsPanelProps {
  bookingId: string;
  orgId: string;
  /** Table to update: "booking_requests" or "concierge_orders" */
  tableName: "booking_requests" | "concierge_orders";
  /** Current document URLs */
  documentUrls: string[];
  /** Called after upload/delete to refresh parent data */
  onUpdate: () => void;
  /** Compact mode hides search */
  compact?: boolean;
}

export default function BookingDocumentsPanel({
  bookingId, orgId, tableName, documentUrls, onUpdate, compact,
}: BookingDocumentsPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? documentUrls.filter((url) => url.toLowerCase().includes(search.toLowerCase()))
    : documentUrls;

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);

    try {
      const newUrls = [...documentUrls];
      for (const file of Array.from(files)) {
        const path = `${orgId}/${bookingId}/${Date.now()}-${file.name}`;
        const { error } = await uploadBookingDocumentFile(path, file).then(() => ({ error: null })).catch(e => ({ error: e }));
        if (error) throw error;
        const publicUrl = getBookingDocumentPublicUrl(path);
        newUrls.push(publicUrl);
      }

      await updateDocumentUrls(tableName, bookingId, newUrls);

      toast.success(`${files.length} document(s) uploaded`);
      onUpdate();
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  }, [bookingId, orgId, tableName, documentUrls, onUpdate]);

  const removeDoc = useCallback(async (index: number) => {
    const updated = documentUrls.filter((_, i) => i !== index);
    await updateDocumentUrls(tableName, bookingId, updated);
    toast.success("Document removed");
    onUpdate();
  }, [bookingId, tableName, documentUrls, onUpdate]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> Documents ({documentUrls.length})
        </h3>
      </div>

      {!compact && documentUrls.length > 3 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-1.5">
          {filtered.map((url, i) => {
            const filename = decodeURIComponent(url.split("/").pop() || `Document ${i + 1}`);
            // Remove timestamp prefix for display
            const displayName = filename.replace(/^\d+-/, "");
            return (
              <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground truncate">{displayName}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => window.open(url, "_blank")}>
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeDoc(documentUrls.indexOf(url))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-[var(--card-radius)] p-3 cursor-pointer hover:bg-muted/20 transition-colors">
        <Upload className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {uploading ? "Uploading..." : "Upload passport, ID card, visa, documents..."}
        </span>
        <input type="file" className="hidden" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleUpload} disabled={uploading} />
      </label>
    </div>
  );
}
