/**
 * MerchantQrCockpit — Merchant dashboard panel for QR payment management.
 * Generate, manage, and track merchant QR codes and instant payments.
 */
import { useState, useCallback, useMemo } from "react";
import { QrCode, Plus, Copy, Share2, Check, TrendingUp, Wallet, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import BrandedQR from "@/components/qr/BrandedQR";
import {
  createStaticMerchantQr,
  createDynamicMerchantQr,
  createAgentQr,
  encodeMerchantQr,
  toMerchantPayUrl,
  type MerchantQrPayload,
} from "@/lib/merchant-qr";
import { formatMoney } from "@/lib/format";

interface MerchantQrCockpitProps {
  merchantId: string;
  merchantName: string;
  walletId: string;
  ownerUserId: string;
  currency?: string;
}

type QrTab = "static" | "dynamic" | "agent";

export default function MerchantQrCockpit({
  merchantId,
  merchantName,
  walletId,
  ownerUserId,
  currency = "AED",
}: MerchantQrCockpitProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<QrTab>("static");
  const [amount, setAmount] = useState("");
  const [tableCode, setTableCode] = useState("");
  const [agentId, setAgentId] = useState("");
  const [copied, setCopied] = useState(false);
  const [generatedQr, setGeneratedQr] = useState<MerchantQrPayload | null>(null);

  const handleGenerate = useCallback(() => {
    let payload: MerchantQrPayload;

    if (tab === "static") {
      payload = createStaticMerchantQr({
        merchantId,
        walletId,
        merchantName,
        currency,
        tableCode: tableCode || undefined,
      });
    } else if (tab === "dynamic") {
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) {
        toast({ title: "Enter a valid amount", variant: "destructive" });
        return;
      }
      payload = createDynamicMerchantQr({
        merchantId,
        walletId,
        merchantName,
        amount: amt,
        currency,
        tableCode: tableCode || undefined,
      });
    } else {
      if (!agentId.trim()) {
        toast({ title: "Enter agent/driver ID", variant: "destructive" });
        return;
      }
      payload = createAgentQr({
        merchantId,
        walletId,
        merchantName,
        agentId: agentId.trim(),
        amount: amount ? parseFloat(amount) : undefined,
        currency,
      });
    }

    setGeneratedQr(payload);
    toast({ title: `${tab} QR generated` });
  }, [tab, amount, tableCode, agentId, merchantId, walletId, merchantName, currency, toast]);

  const qrString = useMemo(() => {
    return generatedQr ? encodeMerchantQr(generatedQr) : null;
  }, [generatedQr]);

  const shareUrl = useMemo(() => {
    return generatedQr ? toMerchantPayUrl(generatedQr) : "";
  }, [generatedQr]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast({ title: "Payment link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { key: QrTab; label: string; icon: React.ReactNode }[] = [
    { key: "static", label: "Static", icon: <QrCode className="w-4 h-4" /> },
    { key: "dynamic", label: "Dynamic", icon: <TrendingUp className="w-4 h-4" /> },
    { key: "agent", label: "Agent", icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">QR Payments</h3>
          <p className="text-xs text-muted-foreground">Generate and manage payment QR codes</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
          <Wallet className="w-3.5 h-3.5" />
          Instant
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1.5 p-1 bg-muted/50 rounded-xl">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setGeneratedQr(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="space-y-3">
        {(tab === "dynamic" || tab === "agent") && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Amount ({currency})
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl"
            />
          </div>
        )}

        {(tab === "static" || tab === "dynamic") && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Table / Terminal Code (optional)
            </label>
            <Input
              placeholder="e.g. T1, Counter-A"
              value={tableCode}
              onChange={(e) => setTableCode(e.target.value)}
              className="rounded-xl"
            />
          </div>
        )}

        {tab === "agent" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Agent / Driver ID
            </label>
            <Input
              placeholder="Agent user ID"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="rounded-xl"
            />
          </div>
        )}

        <Button onClick={handleGenerate} className="w-full rounded-xl gap-2">
          <Plus className="w-4 h-4" />
          Generate {tab} QR
        </Button>
      </div>

      {/* Generated QR */}
      {qrString && generatedQr && (
        <div className="flex flex-col items-center gap-4 p-5 rounded-2xl border border-border bg-card">
          <div className="relative">
            <div className="w-48 h-48 flex items-center justify-center">
              <BrandedQR value={qrString} size={180} darkMode />
            </div>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                generatedQr.mode === "static"
                  ? "bg-primary text-primary-foreground"
                  : generatedQr.mode === "dynamic"
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-secondary-foreground"
              }`}>
                {generatedQr.mode} QR
              </span>
            </div>
          </div>

          {/* Payment info */}
          <div className="text-center space-y-1">
            <p className="font-bold text-foreground">{merchantName}</p>
            {generatedQr.amount ? (
              <p className="text-xl font-extrabold text-foreground tabular-nums">
                {formatMoney(generatedQr.amount, currency)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Customer enters amount</p>
            )}
            {generatedQr.tableCode && (
              <p className="text-xs text-muted-foreground">Table: {generatedQr.tableCode}</p>
            )}
            {generatedQr.expiresAt && (
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Expires: {new Date(generatedQr.expiresAt).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 w-full">
            <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1 rounded-xl">
              {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? "Copied" : "Copy Link"}
            </Button>
            {"share" in navigator && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.share?.({ title: "Pay " + merchantName, url: shareUrl })}
                className="flex-1 rounded-xl"
              >
                <Share2 className="w-4 h-4 mr-1.5" />
                Share
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
