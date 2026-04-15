import { useState } from "react";
import WhatsAppIcon from "./WhatsAppIcon";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppSharePreviewProps {
  title: string;
  message: string;
  imageUrl?: string;
  price?: string;
  url: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function WhatsAppSharePreview({
  title, message, imageUrl, price, url, onConfirm, onCancel,
}: WhatsAppSharePreviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}>
      <div
        className="w-full max-w-sm mx-4 mb-4 sm:mb-0 bg-background rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <WhatsAppIcon size={18} className="text-[#25D366]" />
            <span className="text-sm font-semibold">Share via WhatsApp</span>
          </div>
          <button onClick={onCancel} className="p-1 rounded-full hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#dcf8c6]/30 border border-[#25D366]/10">
            {imageUrl && (
              <img src={imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" loading="lazy" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold line-clamp-2 text-foreground">{title}</p>
              {price && <p className="text-xs font-bold text-[#25D366] mt-0.5">{price}</p>}
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 break-words">{url}</p>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-6 break-words">{message}</p>
          </div>
        </div>

        <div className="flex gap-2 p-4 pt-0">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2",
              "bg-[#25D366] hover:bg-[#20bd5a] text-white transition-colors",
            )}
          >
            <WhatsAppIcon size={16} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
