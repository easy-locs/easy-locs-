import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountIdentity } from "@/hooks/useAccountIdentity";
import { toast } from "sonner";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { executeWalletTransfer } from "@/lib/wallet/wallet-transfer";
import { emitTransferCompleted } from "@/lib/super-app-bridge";
import { resolvePayTarget, type ResolvedPayTarget } from "@/lib/wallet/resolvePayTarget";
import { resolveEntityOwner } from "@/lib/radar/owner-resolver";
import { guardWalletReady } from "@/lib/wallet/wallet-guard";
import { ensureWalletBinding } from "@/lib/wallet/wallet-identity-binding";
import { getDeviceFingerprint } from "@/lib/orbit-keystore";
import { checkDailyLimit, isLargeTransaction, DAILY_TRANSFER_LIMITS } from "@/lib/wallet-limits";
import { typedQueries } from "@/lib/db/typed-queries";
import { AppCard } from "@/components/ui/AppCard";
import { AppActionButton } from "@/components/ui/AppActionButton";
import { ArrowLeft, User, AlertTriangle, ArrowRightLeft, Loader2, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as paymentsRepo from "@/repositories/payments.repository";
import PinEntryDialog from "@/components/wallet/PinEntryDialog";
import TransferSuccessScreen from "@/components/wallet/TransferSuccessScreen";
import { ContactPickerSheet, InviteContactSheet, type PickableContact } from "@/components/wallet/ContactPickerSheet";
import { useReturnToOrigin } from "@/hooks/useReturnToOrigin";
import { useI18n } from "@/lib/i18n";
import { computeExchangeRate, RATES_TO_EUR } from "@/hooks/useCurrencyConversion";
import { AppText } from "@/components/ui/AppText";

function formatCurrencyAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function WalletTransferPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const accountIdentity = useAccountIdentity();
  const { t } = useI18n();
  const { balance, currency, reload: reloadBalance, optimisticAdjust } = useWalletBalance();
  const { returnToOrigin, hasOrigin } = useReturnToOrigin("/wallet");

  const [target, setTarget] = useState<ResolvedPayTarget | null>(null);
  const [selectedContact, setSelectedContact] = useState<PickableContact | null>(null);
  const [amount, setAmount] = useState("25");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hasPinSet, setHasPinSet] = useState<boolean | null>(null);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [walletReady, setWalletReady] = useState<{ valid: boolean; walletId: string | null; error?: string } | null>(null);
  const [todaySpent, setTodaySpent] = useState(0);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [inviteContact, setInviteContact] = useState<PickableContact | null>(null);
  const [recipientCurrency, setRecipientCurrency] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMeta, setSuccessMeta] = useState<{ amount: string; currency: string; name: string } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    paymentsRepo.invokeWalletPin({ action: "check_status" })
      .then(({ data }) => setHasPinSet(data?.has_pin ?? false))
      .catch(() => setHasPinSet(false));

    guardWalletReady(user.id).then(async (guard) => {
      if (!guard.valid && guard.device_changed && guard.walletId) {
        const deviceId = await getDeviceFingerprint();
        await ensureWalletBinding(user.id, deviceId, guard.walletId);
        const retried = await guardWalletReady(user.id);
        setWalletReady({ valid: retried.valid, walletId: retried.walletId, error: retried.error });
      } else {
        setWalletReady({ valid: guard.valid, walletId: guard.walletId, error: guard.error });
      }
      if (guard.valid && guard.walletId) {
        getDeviceFingerprint().then(deviceId => {
          ensureWalletBinding(user.id, deviceId, guard.walletId!).catch(() => {});
        }).catch(() => {});
      }
    }).catch(() => setWalletReady({ valid: false, walletId: null, error: "Guard check failed" }));

    typedQueries.walletTransactions.selectTodaySentTotal(user.id).then(({ data }) => {
      if (data && data.length > 0) {
        const total = data.reduce((sum, row) => sum + (row.amount || 0), 0);
        setTodaySpent(total);
      }
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    const to = searchParams.get("to");
    const orbitId = searchParams.get("orbitId");
    const entityId = searchParams.get("entity");
    if (!to && !orbitId && !entityId) return;

    void (async () => {
      setSearching(true);
      try {
        let resolvedUserId: string | undefined = to ?? undefined;
        if (!resolvedUserId && entityId) {
          const ownerResult = await resolveEntityOwner(entityId, undefined);
          if (ownerResult?.ownerUserId) {
            resolvedUserId = ownerResult.ownerUserId;
          }
        }
        const resolved = await resolvePayTarget({
          userId: resolvedUserId,
          orbitId: orbitId ?? undefined,
        });
        if (resolved) {
          setTarget(resolved);
          if (resolved.currency && resolved.currency !== currency) {
            setRecipientCurrency(resolved.currency);
          }
        }
      } catch (e) {
        console.error("[WalletTransfer] prefill resolve failed", e);
      } finally {
        setSearching(false);
      }
    })();
  }, [searchParams]);

  const handleSelectEasyLocsUser = async (contact: PickableContact) => {
    if (!contact.peer_user_id) return;
    setShowContactPicker(false);
    setTarget(null);
    setSelectedContact(null);
    setRecipientCurrency(null);
    setSearching(true);
    try {
      const resolved = await resolvePayTarget({ userId: contact.peer_user_id });
      if (resolved) {
        setSelectedContact(contact);
        setTarget(resolved);
        if (resolved.currency && resolved.currency !== currency) {
          setRecipientCurrency(resolved.currency);
        }
      } else {
        toast.error(t("wallet.recipientNotFound") || "Recipient not found");
      }
    } catch {
      toast.error(t("wallet.recipientNotFound") || "Recipient not found");
    } finally {
      setSearching(false);
    }
  };

  const handleInviteContact = (contact: PickableContact) => {
    setShowContactPicker(false);
    setInviteContact(contact);
    setShowInviteSheet(true);
  };

  const clearRecipient = () => {
    setTarget(null);
    setSelectedContact(null);
    setRecipientCurrency(null);
  };

  const walletWarning = target && target.walletStatus !== "active";

  const fxRate = useMemo(() => {
    if (!recipientCurrency || recipientCurrency === currency) return null;
    if (!RATES_TO_EUR[currency] || !RATES_TO_EUR[recipientCurrency]) return null;
    return computeExchangeRate(currency, recipientCurrency);
  }, [currency, recipientCurrency]);

  const convertedAmount = useMemo(() => {
    if (!fxRate || !amount) return null;
    return Number(amount) * fxRate;
  }, [fxRate, amount]);

  const validateBeforeTransfer = useCallback((): boolean => {
    if (!user?.id) { toast.error(t("wallet.signInFirst") || "Please sign in first"); return false; }
    if (walletReady && !walletReady.valid) { toast.error(walletReady.error || t("wallet.walletNotReady") || "Wallet not ready"); return false; }
    if (!target?.targetUserId) { toast.error(t("wallet.findRecipientFirst") || "Select a contact first"); return false; }
    if (selectedContact?.peer_user_id && target.targetUserId !== selectedContact.peer_user_id) {
      toast.error(t("wallet.recipientMismatch") || "Recipient mismatch — please reselect contact");
      setTarget(null);
      setSelectedContact(null);
      return false;
    }
    if (target.walletStatus === "missing") { toast.error(t("wallet.noWallet") || "Recipient has no active wallet"); return false; }
    if (target.walletStatus === "locked") { toast.error(t("wallet.walletLocked") || "Recipient wallet is locked"); return false; }
    const numAmount = Number(amount ?? 0);
    if (!numAmount || numAmount <= 0) { toast.error(t("wallet.invalidAmount") || "Enter a valid amount"); return false; }
    if (numAmount > balance) { toast.error(t("wallet.insufficient") || "Insufficient balance"); return false; }
    if (target.targetUserId === user.id) { toast.error(t("wallet.cannotSendSelf") || "Cannot send to yourself"); return false; }
    const limitCheck = checkDailyLimit(todaySpent, numAmount);
    if (!limitCheck.allowed) {
      toast.error(t("wallet.dailyLimitReached") || `Daily limit reached. Remaining: ${limitCheck.remaining.toLocaleString()} ${currency}`);
      return false;
    }
    return true;
  }, [user?.id, target, selectedContact, amount, balance, t, walletReady, todaySpent, currency]);

  const handleTransferClick = useCallback(() => {
    if (!validateBeforeTransfer()) return;
    if (hasPinSet) {
      setShowPinDialog(true);
    } else {
      doTransfer(undefined);
    }
  }, [validateBeforeTransfer, hasPinSet]);

  const doTransfer = async (pin: string | undefined) => {
    if (!user?.id || !target?.targetUserId) return;
    const numAmount = Number(amount ?? 0);

    setShowPinDialog(false);
    optimisticAdjust(-numAmount);
    setSaving(true);

    try {
      const result = await executeWalletTransfer({
        senderUserId: user.id,
        receiverUserId: target.targetUserId,
        amount: numAmount,
        currency,
        description: note.trim() || t("wallet.transfer"),
        transactionType: "manual_transfer",
        pin: pin,
      });

      if (!result.success) {
        throw new Error(result.error || t("wallet.transferFailed"));
      }

      if (walletReady?.walletId) {
        getDeviceFingerprint().then(deviceId => {
          ensureWalletBinding(user.id, deviceId, walletReady.walletId!).catch(() => {});
        }).catch(() => {});
      }

      setTodaySpent(prev => prev + numAmount);
      await reloadBalance();

      const displayName = selectedContact?.display_name || target.displayName || t("wallet.unknownUser");

      emitTransferCompleted({
        senderId: user.id,
        receiverId: target.targetUserId,
        amount: numAmount,
        currency,
        description: note.trim() || undefined,
        senderName: accountIdentity.displayName || user.email || undefined,
        receiverName: displayName || undefined,
      });

      setSuccessMeta({ amount: String(numAmount), currency, name: displayName || t("wallet.unknownUser") });
      setShowSuccess(true);
    } catch (err: unknown) {
      optimisticAdjust(numAmount);
      const message = err instanceof Error ? err.message : t("wallet.transferFailed");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  if (showSuccess && successMeta) {
    return (
      <TransferSuccessScreen
        amount={successMeta.amount}
        currency={successMeta.currency}
        recipientName={successMeta.name}
        onDone={() => returnToOrigin(500)}
      />
    );
  }

  return (
    <div className="app-mobile-page app-mobile-content bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => hasOrigin ? returnToOrigin(0) : navigate("/wallet")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-[0.95] transition-transform">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">{t("wallet.sendMoney") || "Send Money"}</h1>
          <p className="text-xs text-muted-foreground">{t("wallet.sendSubtitle") || "Transfer to a contact instantly"}</p>
        </div>
      </div>

      <div className="px-4 space-y-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("wallet.recipient") || "Recipient"}</p>

          <AnimatePresence mode="wait">
            {target && !searching ? (
              <motion.div
                key="resolved"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
              >
                <AppCard variant="elevated" padding="sm" className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden" style={{ background: "hsl(38 65% 56% / 0.1)" }}>
                    {target.avatarUrl || selectedContact?.avatar_url ? (
                      <img src={target.avatarUrl || selectedContact?.avatar_url || ""} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold" style={{ color: "hsl(38 65% 56%)" }}>
                        {(selectedContact?.display_name || target.displayName) ? initials(selectedContact?.display_name || target.displayName || "") : <User className="h-5 w-5" style={{ color: "hsl(38 65% 56%)" }} />}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">{selectedContact?.display_name || target.displayName || t("wallet.unknownUser")}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {selectedContact?.phone || (target.currency && target.currency !== currency
                        ? `${t("wallet.walletIn") || "Wallet in"} ${target.currency}`
                        : t("wallet.verified") || "Verified account"
                      )}
                    </p>
                  </div>
                  <button
                    onClick={clearRecipient}
                    className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                    style={{ background: "hsl(var(--muted) / 0.5)", color: "hsl(var(--foreground))" }}
                  >
                    {t("wallet.change") || "Change"}
                  </button>
                </AppCard>
              </motion.div>
            ) : (
              <motion.div key="picker" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <button
                  onClick={() => setShowContactPicker(true)}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 border-dashed border-border/30 active:scale-[0.98] transition-transform"
                  style={{ background: "hsl(var(--card))" }}
                >
                  {searching ? (
                    <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "hsl(38 65% 56% / 0.1)" }}>
                      <Users className="w-5 h-5" style={{ color: "hsl(38 65% 56%)" }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <AppText as="p" size="sm" lines={1} className="font-semibold">
                      {searching ? (t("wallet.searching") || "Searching…") : (t("wallet.chooseContact") || "Choose a contact")}
                    </AppText>
                    <AppText as="p" size="xs" lines={1} muted className="mt-0.5">
                      {t("wallet.tapToSelect") || "Tap to select from your contacts"}
                    </AppText>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {walletWarning && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive font-medium">
              {target?.walletStatus === "locked"
                ? t("wallet.recipientLocked") || "Recipient's wallet is locked"
                : t("wallet.recipientNoWallet") || "Recipient has no active wallet"}
            </p>
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("wallet.amount") || "Amount"}</p>
          <div className="rounded-2xl bg-card border border-border/10 p-5 text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="text-lg text-muted-foreground font-bold shrink-0">{currency}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="text-4xl font-extrabold text-foreground text-center bg-transparent outline-none w-[160px] tabular-nums"
                style={{ WebkitAppearance: "none", MozAppearance: "textfield" } as React.CSSProperties}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {t("wallet.balance") || "Balance"}: {formatCurrencyAmount(balance, currency)}
              {Number(amount) > 0 && Number(amount) <= balance && (
                <span className="ml-1 text-emerald-500">→ {formatCurrencyAmount(balance - Number(amount), currency)} {t("wallet.remaining") || "remaining"}</span>
              )}
              {Number(amount) > balance && (
                <span className="ml-1 text-destructive">{t("wallet.insufficient") || "Insufficient"}</span>
              )}
            </p>

            {fxRate && convertedAmount && Number(amount) > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 pt-3 border-t border-border/10"
              >
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>
                    {formatCurrencyAmount(Number(amount), currency)} ≈ {formatCurrencyAmount(convertedAmount, recipientCurrency!)}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  1 {currency} = {fxRate.toFixed(4)} {recipientCurrency} · {t("wallet.rateApprox") || "Approximate rate"}
                </p>
              </motion.div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            {[25, 50, 100, 250, 500].map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(String(preset))}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95"
                style={{
                  background: Number(amount) === preset ? "hsl(var(--primary))" : "hsl(var(--muted) / 0.5)",
                  color: Number(amount) === preset ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        </motion.div>

        {Number(amount) > 0 && (() => {
          const lim = checkDailyLimit(todaySpent, Number(amount));
          const pct = Math.round((todaySpent / lim.limit) * 100);
          if (pct >= 50 || !lim.allowed) return (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${!lim.allowed ? "bg-destructive/10 border-destructive/20" : "bg-amber-500/10 border-amber-500/20"}`}
            >
              <AlertTriangle className={`h-4 w-4 shrink-0 ${!lim.allowed ? "text-destructive" : "text-amber-500"}`} />
              <p className={`text-xs font-medium ${!lim.allowed ? "text-destructive" : "text-amber-600"}`}>
                {!lim.allowed
                  ? `${t("wallet.dailyLimitReached") || "Daily limit reached"} — ${formatCurrencyAmount(lim.remaining, currency)} ${t("wallet.remaining") || "remaining"}`
                  : `${t("wallet.dailyLimitWarning") || "Daily limit"}: ${formatCurrencyAmount(lim.remaining, currency)} ${t("wallet.remaining") || "remaining"} (${pct}% ${t("wallet.used") || "used"})`}
              </p>
            </motion.div>
          );
          return null;
        })()}

        {isLargeTransaction(Number(amount || 0)) && Number(amount) > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/15"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <p className="text-[11px] text-amber-600 font-medium">{t("wallet.largeTxWarning") || "Large transaction — PIN verification required"}</p>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("wallet.note") || "Note"}</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t("wallet.notePlaceholder") || "What's it for? (optional)"} className="w-full rounded-xl border border-border/20 bg-card px-3 py-3 text-sm text-foreground resize-none outline-none focus:ring-2 focus:ring-primary/20" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <AppActionButton full onClick={handleTransferClick} loading={saving} disabled={!target || !!walletWarning || hasPinSet === null || (walletReady !== null && !walletReady.valid)}>
            {saving ? (t("wallet.sending") || "Sending…") : hasPinSet === null ? (t("wallet.checkingSecurity") || "Checking security…") : `${t("wallet.send") || "Send"} ${Number(amount) > 0 ? formatCurrencyAmount(Number(amount), currency) : ""}`}
          </AppActionButton>
        </motion.div>
      </div>

      <ContactPickerSheet
        open={showContactPicker}
        onOpenChange={setShowContactPicker}
        onSelectEasyLocsUser={handleSelectEasyLocsUser}
        onInviteContact={handleInviteContact}
      />

      <InviteContactSheet
        open={showInviteSheet}
        onOpenChange={setShowInviteSheet}
        contact={inviteContact}
      />

      <PinEntryDialog
        open={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        onVerified={doTransfer}
      />
    </div>
  );
}
