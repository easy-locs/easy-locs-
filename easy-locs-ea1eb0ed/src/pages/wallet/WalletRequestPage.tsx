import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SubPageShell from "@/components/layout/SubPageShell";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountIdentity } from "@/hooks/useAccountIdentity";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { getWalletDefaultCurrency } from "@/lib/wallet/wallet-config";
import { toast } from "sonner";
import { typedQueries } from "@/lib/db/typed-queries";
import { guardWalletReady } from "@/lib/wallet/wallet-guard";
import { ensureWalletBinding } from "@/lib/wallet/wallet-identity-binding";
import { getDeviceFingerprint } from "@/lib/orbit-keystore";
import { Send, Loader2, MessageSquare, Users, ArrowRightLeft, AlertTriangle, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { computeExchangeRate, RATES_TO_EUR } from "@/hooks/useCurrencyConversion";
import { AppCard } from "@/components/ui/AppCard";
import { AppText } from "@/components/ui/AppText";
import { ContactPickerSheet, InviteContactSheet, type PickableContact } from "@/components/wallet/ContactPickerSheet";
import { useUiEngine } from "@/hooks/useUiEngine";

const QUICK_AMOUNTS = [25, 50, 100, 250, 500];

import { formatWalletAmount as formatCurrencyAmount } from "@/lib/format";

export default function WalletRequestPage() {
  useUiEngine("wallet-walletrequestpage");
  const navigate = useNavigate();
  const { user } = useAuth();
  const accountIdentity = useAccountIdentity();
  const { t } = useI18n();
  const { currency: walletCurrency } = useWalletBalance();
  const currency = walletCurrency ?? getWalletDefaultCurrency();
  const [amount, setAmount] = useState("25");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [resolvedTarget, setResolvedTarget] = useState<{ id: string; name: string; currency?: string } | null>(null);
  const [selectedContact, setSelectedContact] = useState<PickableContact | null>(null);
  const [walletReady, setWalletReady] = useState<{ valid: boolean; walletId: string | null; error?: string } | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [inviteContact, setInviteContact] = useState<PickableContact | null>(null);

  useEffect(() => {
    if (!user?.id) return;
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
  }, [user?.id]);

  const handleSelectEasyLocsUser = (contact: PickableContact) => {
    setShowContactPicker(false);
    setSelectedContact(contact);
    if (contact.peer_user_id) {
      const name = contact.display_name || "Contact";
      setResolvedTarget({ id: contact.peer_user_id, name });
    }
  };

  const handleInviteContact = (contact: PickableContact) => {
    setShowContactPicker(false);
    setInviteContact(contact);
    setShowInviteSheet(true);
  };

  const clearRecipient = () => {
    setResolvedTarget(null);
    setSelectedContact(null);
  };

  const fxRate = useMemo(() => {
    if (!resolvedTarget?.currency || resolvedTarget.currency === currency) return null;
    if (!RATES_TO_EUR[currency] || !RATES_TO_EUR[resolvedTarget.currency]) return null;
    return computeExchangeRate(currency, resolvedTarget.currency);
  }, [currency, resolvedTarget?.currency]);

  const convertedAmount = useMemo(() => {
    if (!fxRate || !amount) return null;
    return Number(amount) * fxRate;
  }, [fxRate, amount]);

  const submit = async () => {
    if (!user?.id) { toast.error(t("wallet.signInFirst") || "Please sign in first"); return; }
    if (walletReady && !walletReady.valid) { toast.error(walletReady.error || t("wallet.walletNotReady") || "Wallet not ready"); return; }
    if (!resolvedTarget?.id) { toast.error(t("wallet.selectContactFirst") || "Select a contact first"); return; }
    const numAmount = Number(amount ?? 0);
    if (!numAmount || numAmount <= 0) { toast.error(t("wallet.invalidAmount") || "Enter a valid amount"); return; }

    if (resolvedTarget.id === user.id) {
      toast.error(t("wallet.cannotRequestSelf") || "Cannot request money from yourself");
      return;
    }

    try {
      setSaving(true);

      const displayName = accountIdentity.displayName;

      const { error } = await typedQueries.walletTransactions.insertRequest({
        sender_id: resolvedTarget.id,
        recipient_id: user.id,
        amount: numAmount,
        currency,
        context_type: "request",
        title: note.trim() || (t("wallet.paymentRequest") || "Payment Request"),
        subtitle: `${t("wallet.requestFrom") || "Request from"} ${displayName}`,
        status: "pending",
        metadata: { is_request: true, requester_id: user.id },
      });
      if (error) throw error;

      if (walletReady?.walletId) {
        getDeviceFingerprint().then(deviceId => {
          ensureWalletBinding(user.id, deviceId, walletReady.walletId!).catch(() => {});
        }).catch(() => {});
      }

      toast.success(t("wallet.requestSent") || "Request sent");
      navigate("/wallet");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  return (
    <SubPageShell title={t("wallet.requestMoney") || "Request Money"} subtitle={t("wallet.requestSubtitle") || "Ask someone to send you money"} onBack={() => navigate("/wallet")} noContentPad>

      <div className="px-4 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <p className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("wallet.requestFrom") || "Request from"}</p>

          <AnimatePresence mode="wait">
            {resolvedTarget && selectedContact ? (
              <motion.div
                key="resolved"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
              >
                <AppCard variant="elevated" padding="sm" className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden" style={{ background: "hsl(var(--accent) / 0.1)" }}>
                    {selectedContact.avatar_url ? (
                      <img loading="lazy" src={selectedContact.avatar_url} alt={`${selectedContact.display_name || "Contact"} avatar`} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold" style={{ color: "hsl(var(--accent))" }}>
                        {selectedContact.display_name ? initials(selectedContact.display_name) : <User className="h-5 w-5" style={{ color: "hsl(var(--accent))" }} />}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground line-clamp-1 break-words">{resolvedTarget.name}</p>
                    {selectedContact.phone && (
                      <p className="text-[0.6875rem] text-muted-foreground truncate">{selectedContact.phone}</p>
                    )}
                  </div>
                  <button
                    onClick={clearRecipient}
                    className="shrink-0 text-[0.6875rem] font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform bg-muted/50 text-foreground"
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
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.1)" }}>
                    <Users className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <AppText as="p" size="sm" lines={1} className="font-semibold">
                      {t("wallet.chooseContact") || "Choose a contact"}
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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("wallet.amount") || "Amount"}</p>
          <div className="rounded-2xl bg-card border border-border/10 p-5 text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="text-lg text-muted-foreground font-bold shrink-0">{currency}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                className="text-4xl font-extrabold text-foreground text-center bg-transparent outline-none w-[160px] tabular-nums"
                style={{ WebkitAppearance: "none", MozAppearance: "textfield" } as React.CSSProperties}
              />
            </div>

            {fxRate && convertedAmount && Number(amount) > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 pt-3 border-t border-border/10"
              >
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>≈ {formatCurrencyAmount(convertedAmount, resolvedTarget?.currency ?? "")}</span>
                </div>
              </motion.div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className="flex-1 py-2 rounded-xl text-[0.6875rem] font-bold transition-all active:scale-95"
                style={{
                  background: Number(amount) === a ? "hsl(var(--primary))" : "hsl(var(--muted) / 0.5)",
                  color: Number(amount) === a ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-1.5"
        >
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> {t("wallet.noteOptional") || "Note (optional)"}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={t("wallet.notePlaceholder") || "What's this for?"}
            className="w-full rounded-xl border border-border/30 bg-card px-3 py-3 text-sm text-foreground resize-none outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          />
        </motion.div>

        {walletReady && !walletReady.valid && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20"
          >
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive font-medium">{walletReady.error || t("wallet.walletNotReady") || "Wallet not ready"}</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={submit}
            disabled={saving || !resolvedTarget || Number(amount) <= 0 || (walletReady !== null && !walletReady.valid)}
            className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.97] transition-transform"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {saving ? (t("wallet.sending") || "Sending…") : `${t("wallet.request") || "Request"} ${formatCurrencyAmount(Number(amount) || 0, currency)}`}
          </button>
        </motion.div>

        <p className="text-[0.625rem] text-muted-foreground/60 text-center leading-relaxed">
          {t("wallet.requestNote") || "The recipient will receive a notification and can approve the payment from their wallet."}
        </p>
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
    </SubPageShell>
  );
}
