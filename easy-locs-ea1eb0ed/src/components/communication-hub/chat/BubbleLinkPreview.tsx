/**
 * BubbleLinkPreview — Rich link preview card inside chat bubbles.
 * Extracts URL from message text, renders a premium preview card.
 */
import { memo, useState, useEffect } from "react";
import { ExternalLink, Globe } from "lucide-react";

interface Props {
  url: string;
  isMe: boolean;
}

interface LinkMeta {
  title: string;
  domain: string;
  description?: string;
  imageUrl?: string;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function BubbleLinkPreviewInner({ url, isMe }: Props) {
  const [meta, setMeta] = useState<LinkMeta | null>(null);

  useEffect(() => {
    // Simple domain-based fallback preview (no server needed)
    const domain = extractDomain(url);
    setMeta({
      title: domain.charAt(0).toUpperCase() + domain.slice(1),
      domain,
    });
  }, [url]);

  if (!meta) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-1.5 mb-1 rounded-xl overflow-hidden border transition-colors hover:opacity-90"
      style={{
        borderColor: isMe
          ? "hsl(var(--primary) / 0.1)"
          : "hsl(var(--border) / 0.08)",
        background: isMe
          ? "hsl(var(--primary) / 0.04)"
          : "hsl(var(--card) / 0.5)",
      }}
    >
      {meta.imageUrl && (
        <img
          src={meta.imageUrl}
          alt=""
          className="w-full h-32 object-cover"
          loading="lazy"
        />
      )}
      <div className="px-3 py-2.5 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <Globe className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }} />
          <span className="text-[10px] font-medium" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
            {meta.domain}
          </span>
        </div>
        <p className="text-[12.5px] font-semibold leading-snug" style={{ color: "hsl(var(--foreground))" }}>
          {meta.title}
        </p>
        {meta.description && (
          <p className="text-[11px] leading-snug line-clamp-2" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
            {meta.description}
          </p>
        )}
      </div>
    </a>
  );
}

export const BubbleLinkPreview = memo(BubbleLinkPreviewInner);
BubbleLinkPreview.displayName = "BubbleLinkPreview";
