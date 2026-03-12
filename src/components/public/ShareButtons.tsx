/**
 * ShareButtons — Reusable social share buttons for any public page.
 * Uses the centralized social-share utilities.
 */
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Share2, MessageCircle, Send, Copy, Check } from "lucide-react";
import { getShareLinks, type ShareableType } from "@/lib/social-share";
import { useState } from "react";
import { toast } from "sonner";

interface ShareButtonsProps {
  type: ShareableType;
  slug: string;
  title: string;
  version?: string | number;
  /** Show inline buttons instead of popover */
  inline?: boolean;
}

export default function ShareButtons({ type, slug, title, version, inline }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const links = getShareLinks(type, slug, title, version);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(links.copy);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  };

  const buttons = (
    <div className={inline ? "flex flex-wrap gap-2" : "grid grid-cols-2 gap-2 p-1"}>
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-2 text-xs font-medium bg-[#25D366]/5 hover:bg-[#25D366]/15 text-[#25D366] border-[#25D366]/20"
        onClick={() => window.open(links.whatsapp, "_blank")}
      >
        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-2 text-xs font-medium bg-[#0088cc]/5 hover:bg-[#0088cc]/15 text-[#0088cc] border-[#0088cc]/20"
        onClick={() => window.open(links.telegram, "_blank")}
      >
        <Send className="h-3.5 w-3.5" /> Telegram
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-2 text-xs font-medium col-span-2"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy link"}
      </Button>
    </div>
  );

  if (inline) return buttons;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs">
          <Share2 className="h-3.5 w-3.5" /> Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Share this listing</p>
        {buttons}
      </PopoverContent>
    </Popover>
  );
}
