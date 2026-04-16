import { useState, useEffect, useCallback } from "react";
import { Nfc, CheckCircle2, XCircle, Loader2, Smartphone, CreditCard, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppCard } from "@/components/ui/AppCard";
import { nfcService, type NfcTagData } from "@/lib/platform/nfc-service";
import { DeviceHaptics } from "@/families/device";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { executeWalletTransfer } from "@/lib/wallet/wallet-transfer";
import { getStoredBinding } from "@/lib/wallet/wallet-identity-binding";
import { formatWalletAmount } from "@/lib/format";
import PinEntryDialog from "@/components/wallet/PinEntryDialog";
import * as paymentsRepo from "@/families/wallet";

interface MerchantPayload {
  type: "merchant_payment";
  merchantId: string;
  merchantName?: string;
  amount: number;
  currency: string;
  reference?: string;
}

function parseMerchantPayload(tag: NfcTagData): MerchantPayload | null {
  for (const record of tag.records) {
    try {
      const data = JSON.parse(record.payload) as Record<string, unknown>;
      if (
        data.type === "merchant_payment" &&
        typeof data.merchantId === "string" &&
        typeof data.amount === "number" &&
        data.amount > 0 &&
        typeof data.currency === "string"
      ) {
        return {
          type: "merchant_payment",
          merchantId: data.merchantId,
          merchantName: typeof data.merchantName === "string" ? data.merchantName : undefined,
          amount: data.amount,
          currency: data.currency,
          reference: typeof data.reference === "string" ? data.reference : undefined,
        };
      }
    } catch {}
  }
  return null;
}

interface TapToPayState {
  scanning: boolean;
  processing: boolean;
  awaitingPin: boolean;
  lastTransactionId?: string;
  pendingPayload?: MerchantPayload;
  pendingTagId?: string;
}

const INITIAL_TAP_STATE: TapToPayState = {
  scanning: false,
  processing: false,
  awaitingPin: false,
};

export default function NfcWalletSettings() {
  const { user } = useAuth();
  const { balance, currency } = useWalletBalance();
  const navigate = useNavigate();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [listening, setListening] = useState(false);
  const [hasPinSet, setHasPinSet] = useState(false);
  const [tapToPay, setTapToPay] = useState<TapToPayState>(INITIAL_TAP_STATE);

  useEffect(() => {
    let mounted = true;
    nfcService.checkAvailability().then((result) => {
      if (mounted) {
        setAvailable(result);
        setChecking(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    paymentsRepo.invokeWalletPin({ action: "check_status" })
      .then(({ data }) => setHasPinSet(data?.has_pin ?? false))
      .catch(() => setHasPinSet(false));
  }, [user?.id]);

  const handleToggleListening = async () => {
    if (listening) {
      await nfcService.stopListening();
      setListening(false);
      DeviceHaptics.trigger("light");
      return;
    }

    const started = await nfcService.startListening();
    if (started) {
      setListening(true);
      DeviceHaptics.trigger("success");
      toast.success("NFC listening activated");
    } else {
      DeviceHaptics.trigger("error");
      toast.error("Could not start NFC. Check your device settings.");
    }
  };

  const scanForMerchantTag = useCallback(async (): Promise<{ tag: NfcTagData; payload: MerchantPayload } | null> => {
    const started = await nfcService.startListening();
    if (!started) {
      DeviceHaptics.trigger("error");
      toast.error("Could not activate NFC scanner");
      return null;
    }

    const tag = await new Promise<NfcTagData | null>((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 30000);

      const cleanup = nfcService.onTagScanned((scanned) => {
        clearTimeout(timeout);
        cleanup();
        resolve(scanned);
      });
    });

    if (!tag) {
      DeviceHaptics.trigger("warning");
      toast.error("NFC scan timed out. Please try again.");
      return null;
    }

    const merchantPayload = parseMerchantPayload(tag);
    if (!merchantPayload) {
      DeviceHaptics.trigger("warning");
      toast.error("This NFC tag does not contain payment information");
      return null;
    }

    return { tag, payload: merchantPayload };
  }, []);

  const executePayment = useCallback(async (pin: string, payload: MerchantPayload, tagId: string) => {
    if (!user?.id) return;

    setTapToPay((prev) => ({ ...prev, awaitingPin: false, processing: true }));
    DeviceHaptics.trigger("medium");

    try {
      const bindingProof = getStoredBinding();
      const transferResult = await executeWalletTransfer({
        senderUserId: user.id,
        receiverUserId: payload.merchantId,
        amount: payload.amount,
        currency: payload.currency,
        description: `NFC payment${payload.merchantName ? ` to ${payload.merchantName}` : ""}${payload.reference ? ` (ref: ${payload.reference})` : ""}`,
        transactionType: "nfc_payment",
        pin,
        idempotencyKey: `nfc_${tagId}_${Date.now()}`,
        deviceBindingProof: bindingProof || undefined,
      });

      if (transferResult.success) {
        DeviceHaptics.trigger("success");
        toast.success(`Payment of ${formatWalletAmount(payload.amount, payload.currency)} completed${payload.merchantName ? ` to ${payload.merchantName}` : ""}`);
        setTapToPay({ ...INITIAL_TAP_STATE, lastTransactionId: transferResult.transactionId });
      } else {
        DeviceHaptics.trigger("error");
        toast.error(transferResult.error || "Payment failed. Please try again.");
        setTapToPay(INITIAL_TAP_STATE);
      }
    } catch (e: unknown) {
      DeviceHaptics.trigger("error");
      const msg = e instanceof Error ? e.message : "Payment failed";
      toast.error(msg);
      setTapToPay(INITIAL_TAP_STATE);
    }
  }, [user?.id]);

  const handleTapToPay = useCallback(async () => {
    if (!user?.id) {
      toast.error("Please sign in to use tap-to-pay");
      return;
    }

    if (!hasPinSet) {
      DeviceHaptics.trigger("warning");
      toast.error("Please set up a wallet PIN before using tap-to-pay");
      navigate("/wallet/security");
      return;
    }

    if (balance <= 0) {
      DeviceHaptics.trigger("warning");
      toast.error("Insufficient wallet balance for tap-to-pay");
      navigate("/wallet/top-up");
      return;
    }

    setTapToPay({ ...INITIAL_TAP_STATE, scanning: true });
    DeviceHaptics.trigger("light");
    toast.info("Hold your device near the payment terminal...");

    const result = await scanForMerchantTag();

    if (!result) {
      setTapToPay(INITIAL_TAP_STATE);
      return;
    }

    const { tag, payload } = result;

    if (payload.amount > balance) {
      DeviceHaptics.trigger("error");
      toast.error(`Insufficient balance. Payment requires ${formatWalletAmount(payload.amount, payload.currency)}`);
      setTapToPay(INITIAL_TAP_STATE);
      return;
    }

    setTapToPay({
      ...INITIAL_TAP_STATE,
      awaitingPin: true,
      pendingPayload: payload,
      pendingTagId: tag.id,
    });
    DeviceHaptics.trigger("medium");
  }, [user?.id, balance, hasPinSet, navigate, scanForMerchantTag]);

  const handlePinVerified = useCallback((pin: string) => {
    if (!tapToPay.pendingPayload || !tapToPay.pendingTagId) return;
    executePayment(pin, tapToPay.pendingPayload, tapToPay.pendingTagId);
  }, [tapToPay.pendingPayload, tapToPay.pendingTagId, executePayment]);

  const handlePinCancelled = useCallback(() => {
    DeviceHaptics.trigger("light");
    toast.info("Payment cancelled");
    setTapToPay(INITIAL_TAP_STATE);
  }, []);

  const handlePropertyCheckIn = async () => {
    DeviceHaptics.trigger("light");
    toast.info("Hold your device near the property NFC tag...");

    const result = await nfcService.readPropertyCheckIn();
    if (result.success) {
      DeviceHaptics.trigger("success");
      toast.success(`Check-in recorded${result.propertyId ? ` for property ${result.propertyId}` : ""}`);
    } else {
      DeviceHaptics.trigger("warning");
      toast.error("Check-in timed out. Try again.");
    }
  };

  if (checking) {
    return (
      <AppCard className="p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Checking NFC availability...</span>
        </div>
      </AppCard>
    );
  }

  if (!available) {
    return (
      <AppCard className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <XCircle className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">NFC Not Available</p>
            <p className="text-xs text-muted-foreground">
              NFC is not supported on this device or is disabled in settings.
            </p>
          </div>
        </div>
      </AppCard>
    );
  }

  return (
    <div className="space-y-3">
      <AppCard className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <Nfc className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">NFC Settings</p>
            <p className="text-xs text-muted-foreground">
              {listening ? "NFC is active and listening" : "Enable NFC for tap-to-pay and property check-in"}
            </p>
          </div>
          {listening && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
        </div>

        <div className="space-y-2">
          <button
            onClick={handleToggleListening}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
              listening
                ? "bg-accent/10 text-accent"
                : "bg-muted/50 text-foreground hover:bg-muted"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <div className="flex-1">
              <p className="text-sm font-medium">{listening ? "Deactivate NFC" : "Activate NFC"}</p>
              <p className="text-xs text-muted-foreground">
                {listening ? "Stop listening for NFC signals" : "Start listening for tap-to-pay and tags"}
              </p>
            </div>
          </button>

          <button
            onClick={handleTapToPay}
            disabled={tapToPay.scanning || tapToPay.processing || tapToPay.awaitingPin}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 text-foreground hover:bg-muted transition-colors text-left disabled:opacity-50"
          >
            {tapToPay.scanning || tapToPay.processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {tapToPay.scanning
                  ? "Scanning terminal..."
                  : tapToPay.processing
                  ? "Processing payment..."
                  : tapToPay.awaitingPin
                  ? "Enter PIN to confirm..."
                  : "Tap to Pay"}
              </p>
              <p className="text-xs text-muted-foreground">
                {balance > 0
                  ? `Balance: ${formatWalletAmount(balance, currency || "EUR")}`
                  : "Top up your wallet to use tap-to-pay"}
              </p>
            </div>
          </button>

          <button
            onClick={handlePropertyCheckIn}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 text-foreground hover:bg-muted transition-colors text-left"
          >
            <Building2 className="w-4 h-4" />
            <div className="flex-1">
              <p className="text-sm font-medium">Property Check-In</p>
              <p className="text-xs text-muted-foreground">Tap an NFC tag to log entry or exit</p>
            </div>
          </button>
        </div>
      </AppCard>

      <PinEntryDialog
        open={tapToPay.awaitingPin}
        onClose={handlePinCancelled}
        onVerified={handlePinVerified}
        title="Confirm NFC Payment"
      />
    </div>
  );
}
