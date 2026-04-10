import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { executeWalletTransfer } from "@/lib/wallet/wallet-transfer";
import { emitTransferCompleted } from "@/lib/super-app-bridge";
import { resolvePayTarget, type ResolvedPayTarget } from "@/lib/wallet/resolvePayTarget";
import { guardWalletReady } from "@/lib/wallet/wallet-guard";
import { ensureWalletBinding } from "@/lib/wallet/wallet-identity-binding";
import { getDeviceFingerprint } from "@/lib/orbit-keystore";
import { checkDailyLimit, isLargeTransaction, DAILY_TRANSFER_LIMITS } from "@/lib/wallet-limits";
import { typedQueries } from "@/lib/db/typed-queries";
import { AppCard } from "@/components/ui/AppCard";
import { AppActionButton } from "@/components/ui/AppActionButton";
import { ArrowLeft, User, Search, AlertTriangle, ChevronRight, Users, ArrowRightLeft, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as paymentsRepo from "@/repositories/payments.repository";
import PinEntryDialog from "@/components/wallet/PinEntryDialog";
import TransferSuccessScreen from "@/components/wallet/TransferSuccessScreen";
import { useReturnToOrigin } from "@/hooks/useReturnToOrigin";
import { useI18n } from "@/lib/i18n";
import { computeExchangeRate, RATES_TO_EUR } from "@/hooks/useCurrencyConversion";
import { listOrbitContacts } from "@/lib/orbit/orbit-contacts-service";
import { Sheet, SheetContent } from "@/components/ui/sheet";

function maskId(id: string): string {
  if (!id || id.length < 8) return "••••";
  return `${id.slice(0, 4)}····${id.slice(-4)}`;
}

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

interface OrbitContact {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  peer_user_id: string | null;
  peer_orbit_id: string | null;
}

export default function WalletTransferPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const { balance, currency, reload: reloadBalance, optimisticAdjust } = useWalletBalance();
  const { returnToOrigin, hasOrigin } = useReturnToOrigin("/wallet");

  const [recipient, setRecipient] = useState(searchParams.get("to") || searchParams.get("email") || "");
  const [target, setTarget] = useState<ResolvedPayTarget | null>(null);
  const [amount, setAmount] = useState("25");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hasPinSet, setHasPinSet] = useState<boolean | null>(null);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [walletReady, setWalletReady] = useState<{ valid: boolean; walletId: string | null; error?: string } | null>(null);
  const [todaySpent, setTodaySpent] = useState(0);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contacts, setContacts] = useState<OrbitContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
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
    const email = searchParams.get("email");
    const orbitId = searchParams.get("orbitId");
    if (!to && !email && !orbitId) return;

    void (async () => {
      setSearching(true);
      try {
        const resolved = await resolvePayTarget({ userId: to ?? undefined, email: email ?? undefined, orbitId: orbitId ?? undefined });
        if (resolved) {
          setTarget(resolved);
          setRecipient(resolved.displayName || resolved.targetUserId);
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

  const loadContacts = useCallback(async () => {
    if (!user?.id) return;
    setContactsLoading(true);
    try {
      const raw = await listOrbitContacts(user.id);
      setContacts(raw.map((c: Record<string, unknown>) => ({
        id: c.id as string,
        display_name: (c.display_name as string) || null,
        email: (c.email as string) || null,
        phone: (c.phone as string) || null,
        avatar_url: (c.avatar_url as string) || null,
        peer_user_id: (c.peer_user_id as string) || null,
        peer_orbit_id: (c.peer_orbit_id as string) || null,
      })));
    } catch {
      toast.error(t("wallet.contactLoadError") || "Could not load contacts");
    } finally {
      setContactsLoading(false);
    }
  }, [user?.id, t]);

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts.filter(c => c.peer_user_id);
    const q = contactSearch.toLowerCase();
    return contacts.filter(c =>
      c.peer_user_id &&
      ((c.display_name?.toLowerCase().includes(q)) ||
       (c.email?.toLowerCase().includes(q)) ||
       (c.phone?.includes(q)))
    );
  }, [contacts, contactSearch]);

  const selectContact = async (contact: OrbitContact) => {
    if (!contact.peer_user_id) return;
    setShowContactPicker(false);
    setSearching(true);
    try {
      const resolved = await resolvePayTarget({ userId: contact.peer_user_id });
      if (resolved) {
        setTarget(resolved);
        setRecipient(contact.display_name || resolved.displayName || "");
        if (resolved.currency && resolved.currency !== currency) {
          setRecipientCurrency(resolved.currency);
        }
      }
    } catch {
      toast.error(t("wallet.recipientNotFound") || "Recipient not found");
    } finally {
      setSearching(false);
    }
  };

  const findRecipient = async () => {
    const trimmed = recipient.trim();
    if (!trimmed) { toast.error(t("wallet.enterRecipient") || "Enter a name, email, or orbit ID"); return; }
    setSearching(true);

    try {
      const resolved = await resolvePayTarget({
        userId: trimmed.includes("@") || trimmed.startsWith("orbit_") || trimmed.startsWith("EL-") ? undefined : trimmed,
        email: trimmed.includes("@") ? trimmed.toLowerCase() : undefined,
        orbitId: trimmed.startsWith("orbit_") || trimmed.startsWith("EL-") ? trimmed : undefined,
      });
      if (resolved) {
        setTarget(resolved);
        if (resolved.currency && resolved.currency !== currency) {
          setRecipientCurrency(resolved.currency);
        }
      } else {
        toast.error(t("wallet.recipientNotFound") || "Recipient not found");
      }
    } catch {
      toast.error(t("wallet.searchFailed") || "Search failed");
    } finally {
      setSearching(false);
    }
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
    if (!target?.targetUserId) { toast.error(t("wallet.findRecipientFirst") || "Find a recipient first"); return false; }
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
    if (isLargeTransaction(numAmount)) {
    }
    return true;
  }, [user?.id, target, amount, balance, t, walletReady, todaySpent, currency]);

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

      emitTransferCompleted({
        senderId: user.id,
        receiverId: target.targetUserId,
        amount: numAmount,
        currency,
        description: note.trim() || undefined,
        senderName: user.user_metadata?.display_name || user.email || undefined,
        receiverName: target.displayName || undefined,
      });

      setSuccessMeta({ amount: String(numAmount), currency, name: target.displayName || t("wallet.unknownUser") });
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
          <div className="flex gap-2">
            <div className="flex-1 flex gap-2">
              <input
                value={recipient}
                onChange={(e) => { setRecipient(e.target.value); setTarget(null); setRecipientCurrency(null); }}
                placeholder={t("wallet.searchPlaceholder") || "Name, email, or EL-ID"}
                className="flex-1 rounded-xl border border-border/20 bg-card px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
              <AppActionButton variant="secondary" onClick={findRecipient} loading={searching}>
                <Search className="h-4 w-4" />
              </AppActionButton>
            </div>
            <button
              onClick={() => { setShowContactPicker(true); loadContacts(); }}
              className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center active:scale-95 transition-transform"
              title={t("wallet.pickContact") || "Pick contact"}
            >
              <Users className="h-4 w-4 text-primary" />
            </button>
          </div>
        </motion.div>

        <AnimatePresence>
          {target && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
              <AppCard variant="elevated" padding="sm" className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {target.avatarUrl ? (
                    <img src={target.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-primary">
                      {target.displayName ? initials(target.displayName) : <User className="h-5 w-5 text-primary" />}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{target.displayName || t("wallet.unknownUser")}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {target.currency && target.currency !== currency
                      ? `${t("wallet.walletIn") || "Wallet in"} ${target.currency}`
                      : t("wallet.verified") || "Verified account"
                    }
                  </p>
                </div>
                <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <span className="text-emerald-500 text-sm">✓</span>
                </div>
              </AppCard>
            </motion.div>
          )}
        </AnimatePresence>

        {walletWarning && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive font-medium">
              {target!.walletStatus === "locked"
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
          <p className="text-center text-[10px] text-muted-foreground mt-2">{t("wallet.zeroFees") || "Zero fees for direct transfers"}</p>
        </motion.div>
      </div>

      <PinEntryDialog
        open={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        onVerified={(pin) => doTransfer(pin)}
        title={t("wallet.confirmPin") || "Confirm with PIN"}
      />

      <Sheet open={showContactPicker} onOpenChange={setShowContactPicker}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] p-0">
          <div className="px-4 pt-5 pb-3">
            <h3 className="text-base font-bold text-foreground">{t("wallet.selectContact") || "Select Contact"}</h3>
            <input
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder={t("wallet.searchContacts") || "Search contacts…"}
              className="mt-3 w-full rounded-xl border border-border/20 bg-muted/30 px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-[55vh] px-2 pb-6">
            {contactsLoading ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t("wallet.loadingContacts") || "Loading contacts…"}</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Users className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">{t("wallet.noContacts") || "No contacts with wallets found"}</p>
              </div>
            ) : (
              filteredContacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectContact(c)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl active:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-primary">
                        {c.display_name ? initials(c.display_name) : "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{c.display_name || c.email || c.phone || "Contact"}</p>
                    {c.email && <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
