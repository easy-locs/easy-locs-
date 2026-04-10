import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { getWalletDefaultCurrency } from "@/lib/wallet/wallet-config";
import { toast } from "sonner";
import { typedQueries } from "@/lib/db/typed-queries";
import { guardWalletReady } from "@/lib/wallet/wallet-guard";
import { ensureWalletBinding } from "@/lib/wallet/wallet-identity-binding";
import { getDeviceFingerprint } from "@/lib/orbit-keystore";
import { ArrowLeft, Send, Loader2, Mail, MessageSquare, CheckCircle, Users, ChevronRight, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { listOrbitContacts } from "@/lib/orbit/orbit-contacts-service";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { computeExchangeRate, RATES_TO_EUR } from "@/hooks/useCurrencyConversion";

const QUICK_AMOUNTS = [25, 50, 100, 250, 500];

function formatCurrencyAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
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
}

export default function WalletRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { currency: walletCurrency } = useWalletBalance();
  const currency = walletCurrency ?? getWalletDefaultCurrency();
  const [targetEmail, setTargetEmail] = useState("");
  const [amount, setAmount] = useState("25");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [resolvedTarget, setResolvedTarget] = useState<{ id: string; name: string; currency?: string } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [walletReady, setWalletReady] = useState<{ valid: boolean; walletId: string | null; error?: string } | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contacts, setContacts] = useState<OrbitContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

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

  const resolveRecipient = async () => {
    const email = targetEmail.trim().toLowerCase();
    if (!email) return;
    setResolving(true);
    try {
      const { data: row } = await typedQueries.profiles.selectByEmail(email);
      if (row) {
        const name = row.name || [row.first_name, row.last_name].filter(Boolean).join(" ") || row.username || email.split("@")[0];
        setResolvedTarget({ id: row.id, name });
      } else {
        setResolvedTarget(null);
      }
    } catch {
      setResolvedTarget(null);
    } finally {
      setResolving(false);
    }
  };

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
      })));
    } catch {
      toast.error(t("wallet.contactLoadError") || "Could not load contacts");
    } finally {
      setContactsLoading(false);
    }
  }, [user?.id, t]);

  const filteredContacts = useMemo(() => {
    const payable = contacts.filter(c => c.peer_user_id && c.email);
    if (!contactSearch.trim()) return payable;
    const q = contactSearch.toLowerCase();
    return payable.filter(c =>
      (c.display_name?.toLowerCase().includes(q)) ||
      (c.email?.toLowerCase().includes(q))
    );
  }, [contacts, contactSearch]);

  const selectContact = (contact: OrbitContact) => {
    setShowContactPicker(false);
    if (contact.email) {
      setTargetEmail(contact.email);
      const name = contact.display_name || contact.email.split("@")[0];
      setResolvedTarget({ id: contact.peer_user_id!, name });
    }
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
    const email = targetEmail.trim().toLowerCase();
    if (!email) { toast.error(t("wallet.enterEmail") || "Enter recipient email"); return; }
    const numAmount = Number(amount ?? 0);
    if (!numAmount || numAmount <= 0) { toast.error(t("wallet.invalidAmount") || "Enter a valid amount"); return; }

    try {
      setSaving(true);

      let targetUserId = resolvedTarget?.id ?? null;
      if (!targetUserId) {
        const { data: row } = await typedQueries.profiles.selectIdByEmail(email);
        targetUserId = row?.id ?? null;
      }

      if (!targetUserId) {
        toast.error(t("wallet.userNotFound") || "User not found — check the email and try again");
        setSaving(false);
        return;
      }

      if (targetUserId === user.id) {
        toast.error(t("wallet.cannotRequestSelf") || "Cannot request money from yourself");
        setSaving(false);
        return;
      }

      const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

      const { error } = await typedQueries.walletTransactions.insertRequest({
          sender_id: targetUserId,
          recipient_id: user.id,
          amount: numAmount,
          currency,
          context_type: "request",
          title: note.trim() || (t("wallet.paymentRequest") || "Payment Request"),
          subtitle: `${t("wallet.requestFrom") || "Request from"} ${displayName}`,
          status: "pending",
          metadata: { requested_from_email: email, is_request: true, requester_id: user.id },
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
    <div className="app-mobile-page app-mobile-content bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/wallet")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-[0.95] transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">{t("wallet.requestMoney") || "Request Money"}</h1>
          <p className="text-xs text-muted-foreground">{t("wallet.requestSubtitle") || "Ask someone to send you money"}</p>
        </div>
      </div>

      <div className="px-4 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-1.5"
        >
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> {t("wallet.recipientEmail") || "Recipient"}
          </label>
          <div className="flex gap-2">
            <input
              value={targetEmail}
              onChange={(e) => { setTargetEmail(e.target.value); setResolvedTarget(null); }}
              onBlur={resolveRecipient}
              placeholder={t("wallet.emailPlaceholder") || "name@example.com"}
              type="email"
              className="flex-1 rounded-xl border border-border/30 bg-card px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
            />
            <button
              onClick={() => { setShowContactPicker(true); loadContacts(); }}
              className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center active:scale-95 transition-transform shrink-0"
              title={t("wallet.pickContact") || "Pick contact"}
            >
              <Users className="h-4 w-4 text-primary" />
            </button>
          </div>
          {resolving && <p className="text-[10px] text-muted-foreground mt-1">{t("wallet.lookingUp") || "Looking up user…"}</p>}
          {resolvedTarget && (
            <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-[11px] font-medium text-emerald-600">{resolvedTarget.name}</span>
            </div>
          )}
          {!resolving && targetEmail.trim() && !resolvedTarget && (
            <p className="text-[10px] text-muted-foreground/60 mt-1">{t("wallet.willReceiveNotif") || "User will receive a payment request notification"}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("wallet.amount") || "Amount"}</p>
          <div className="rounded-2xl bg-card border border-border/10 p-5 text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="text-lg text-muted-foreground font-bold shrink-0">{currency}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                className="text-4xl font-black text-foreground text-center bg-transparent outline-none w-[160px] tabular-nums"
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
                  <span>≈ {formatCurrencyAmount(convertedAmount, resolvedTarget!.currency!)}</span>
                </div>
              </motion.div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95"
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
            disabled={saving || !targetEmail.trim() || Number(amount) <= 0 || (walletReady !== null && !walletReady.valid)}
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

        <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
          {t("wallet.requestNote") || "The recipient will receive a notification and can approve the payment from their wallet."}
        </p>
      </div>

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
                <p className="text-xs text-muted-foreground">{t("wallet.noContacts") || "No contacts found"}</p>
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
                    <p className="text-sm font-semibold text-foreground truncate">{c.display_name || c.email || "Contact"}</p>
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
