/**
 * ShopShareEngine — Module 16: Social sharing for shops.
 * WhatsApp, Telegram, X, Email, QR, Copy link
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Check, Share2, QrCode, Mail, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopName: string;
  shopSlug: string;
  shopDescription?: string;
  shopImage?: string;
}

export default function ShopShareEngine({ shopName, shopSlug, shopDescription, shopImage }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const shopUrl = `${window.location.origin}/s/${shopSlug}`;
  const text = `Check out ${shopName}${shopDescription ? ` — ${shopDescription.slice(0, 80)}` : ""}`;

  const channels = [
    { id: "whatsapp", label: "WhatsApp", color: "bg-[#25D366]/10 text-[#25D366]", url: `https://wa.me/?text=${encodeURIComponent(text + " " + shopUrl)}` },
    { id: "telegram", label: "Telegram", color: "bg-[#0088cc]/10 text-[#0088cc]", url: `https://t.me/share/url?url=${encodeURIComponent(shopUrl)}&text=${encodeURIComponent(text)}` },
    { id: "x", label: "X / Twitter", color: "bg-foreground/10 text-foreground", url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shopUrl)}` },
    { id: "email", label: "Email", color: "bg-primary/10 text-primary", url: `mailto:?subject=${encodeURIComponent(shopName)}&body=${encodeURIComponent(text + "\n\n" + shopUrl)}` },
  ];

  const copyLink = async () => {
    await navigator.clipboard.writeText(shopUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
          <Share2 className="h-3 w-3" /> Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Share {shopName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {/* Copy link */}
          <button onClick={copyLink}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left">
            {copied ? <Check className="h-4 w-4 text-success shrink-0" /> : <Copy className="h-4 w-4 text-muted-foreground shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{copied ? "Copied!" : "Copy link"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{shopUrl}</p>
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

          {/* QR code placeholder */}
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
            <QrCode className="h-16 w-16 text-muted-foreground/30" />
            <p className="text-[10px] text-muted-foreground">QR Code for {shopUrl}</p>
            <p className="text-[9px] text-muted-foreground/60">Share this code so people can scan to visit your shop</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
