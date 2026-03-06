import { useState } from "react";
import { Copy, Check, Code } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

interface EmbedWidgetProps {
  listingSlug: string;
  listingTitle: string;
}

const EmbedWidget = ({ listingSlug, listingTitle }: EmbedWidgetProps) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const embedUrl = `https://www.easy-locs.com/listing/${listingSlug}`;
  const embedCode = `<iframe src="${embedUrl}" width="100%" height="600" style="border:none;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.1);" title="${listingTitle}" loading="lazy"></iframe>`;
  const linkCode = `<a href="${embedUrl}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 24px;background:#D4AF37;color:#1a1a2e;border-radius:8px;font-weight:600;text-decoration:none;">Voir l'annonce sur Easy-Locs</a>`;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(t("embed.copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Code className="h-4 w-4" />
        {t("embed.title")}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("embed.iframe_label")}</label>
          <div className="relative">
            <pre className="bg-muted/50 rounded-lg p-3 text-xs text-foreground overflow-x-auto border border-border">
              {embedCode}
            </pre>
            <button
              onClick={() => handleCopy(embedCode)}
              className="absolute top-2 right-2 p-1.5 rounded bg-background border border-border hover:bg-muted transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("embed.button_label")}</label>
          <div className="relative">
            <pre className="bg-muted/50 rounded-lg p-3 text-xs text-foreground overflow-x-auto border border-border">
              {linkCode}
            </pre>
            <button
              onClick={() => handleCopy(linkCode)}
              className="absolute top-2 right-2 p-1.5 rounded bg-background border border-border hover:bg-muted transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmbedWidget;
