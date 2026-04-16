import { useMemo, useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { qr, toResolveUrl } from "@/lib/qr-engine";
import { Button } from "@/components/ui/button";
import BrandedQR from "@/components/qr/BrandedQR";

interface ProfileQrCardProps {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

export default function ProfileQrCard({ userId, displayName, avatarUrl }: ProfileQrCardProps) {
  const [copied, setCopied] = useState(false);

  const payload = useMemo(
    () => qr.profile(userId, displayName),
    [userId, displayName],
  );

  const link = useMemo(() => toResolveUrl(payload), [payload]);

  const handleCopy = async () => {
    const { copyToClipboard } = await import("@/lib/clipboard");
    const r = await copyToClipboard(link);
    if (!r.ok) {
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: `${displayName} — Easy-Locs`, url: link });
    } catch {}
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        My Profile QR
      </p>

      <BrandedQR value={link} size={200} />

      <p className="text-sm font-semibold text-foreground">{displayName}</p>

      <div className="flex gap-3 w-full">
        <Button variant="outline" className="flex-1 rounded-xl gap-2 h-10 text-xs" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
        {"share" in navigator && (
          <Button variant="outline" className="flex-1 rounded-xl gap-2 h-10 text-xs" onClick={handleShare}>
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
        )}
      </div>
    </div>
  );
}
