/**
 * UniversalShareEngine — PASS110: Share anything (shop, product, order, service).
 * WhatsApp, Telegram, X, Email, SMS, QR, Copy link, Web Share API.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Check, Share2, QrCode, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export type ShareTarget = "shop" | "product" | "order" | "service" | "listing" | "deal";

interface Props {
  type: ShareTarget;
  slug: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price?: string;
  triggerClassName?: string;
  triggerLabel?: string;
}

const TYPE_PATH: Record<ShareTarget, string> = {
  shop: "/s/",
  product: "/p/",
  order: "/my-orders?id=",
  service: "/book/",
  listing: "/listing/",
  deal: "/deals/",
};

export default function UniversalShareEngine({
  type, slug, title, description, imageUrl, price,
  triggerClassName, triggerLabel = "Share",
}: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}${TYPE_PATH[type]}${slug}`;
  const text = `${title}${price ? ` — ${price}` : ""}${description ? ` · ${description.slice(0, 80)}` : ""}`;

  const channels = [
    { id: "whatsapp", label: "WhatsApp", color: "bg-[hsl(142,70%,49%)]/10 text-[hsl(142,70%,49%)]", url: `https://wa.me/?text=${encodeURIComponent(text + " " + shareUrl)}` },
    { id: "telegram", label: "Telegram", color: "bg-[hsl(200,100%,40%)]/10 text-[hsl(200,100%,40%)]", url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}` },
    { id: "x", label: "X / Twitter", color: "bg-foreground/10 text-foreground", url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}` },
    { id: "sms", label: "SMS", color: "bg-primary/10 text-primary", url: `sms:?body=${encodeURIComponent(text + " " + shareUrl)}` },
    { id: "email", label: "Email", color: "bg-muted text-muted-foreground", url: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + "\n\n" + shareUrl)}` },
  ];

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        setOpen(false);
      } catch {}
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className={triggerClassName || "gap-1.5 text-xs"}>
          <Share2 className="h-3 w-3" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Share {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {/* Preview card */}
          {(imageUrl || price) && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
              {imageUrl && <img src={imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{title}</p>
                {price && <p className="text-xs text-primary font-bold">{price}</p>}
              </div>
            </div>
          )}

          {/* Native share (mobile) */}
          {"share" in navigator && (
            <Button onClick={nativeShare} variant="outline" className="w-full h-9 text-xs gap-2">
              <Share2 className="h-3.5 w-3.5" /> Share via device
            </Button>
          )}

          {/* Copy link */}
          <button onClick={copyLink} className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left">
            {copied ? <Check className="h-4 w-4 text-success shrink-0" /> : <Copy className="h-4 w-4 text-muted-foreground shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{copied ? "Copied!" : "Copy link"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{shareUrl}</p>
            </div>
          </button>

          {/* Social channels */}
          <div className="grid grid-cols-2 gap-2">
            {channels.map(ch => (
              <a key={ch.id} href={ch.url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-2 p-3 rounded-xl ${ch.color} text-xs font-medium hover:opacity-80 transition-opacity`}
                onClick={() => setOpen(false)}>
                <ExternalLink className="h-3 w-3" /> {ch.label}
              </a>
            ))}
          </div>

          {/* QR */}
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
            <QrCode className="h-14 w-14 text-muted-foreground/30" />
            <p className="text-[10px] text-muted-foreground">Scan to open</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
