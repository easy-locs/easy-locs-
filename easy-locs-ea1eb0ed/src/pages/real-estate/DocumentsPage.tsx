import { usePropertyDocuments } from "@/hooks/useRealEstate";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function DocumentsPage() {
  useUiEngine("real-estate-documentspage");
  const { data: docs, isLoading, error } = usePropertyDocuments();

  return (
    <div className="space-y-4">
      {isLoading && <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>}

      {error && <div className="text-center py-12 text-destructive"><p className="text-sm">Failed to load documents</p></div>}

      {!isLoading && !error && docs?.length === 0 && (
        <div className="text-center py-16">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        </div>
      )}

      <div className="grid gap-3">
        {docs?.map((d) => (
          <AppCard key={d.id} className="border-border/50">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.title || d.doc_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.created_at ? format(new Date(d.created_at), "dd/MM/yyyy") : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[0.625rem] capitalize">{d.doc_type}</Badge>
                {d.file_url && (
                  <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </CardContent>
          </AppCard>
        ))}
      </div>
    </div>
  );
}
