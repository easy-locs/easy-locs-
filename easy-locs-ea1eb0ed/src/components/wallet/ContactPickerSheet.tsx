import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { listOrbitContacts } from "@/lib/orbit/orbit-contacts-service";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Search, Users, Loader2, ChevronRight, Phone, UserPlus, Link2, CheckCircle, Send, Wallet } from "lucide-react";
import { toast } from "sonner";
import { createInvitePaymentLink, generateShareMessage } from "@/lib/payments/payment-link-service";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { formatMoney } from "@/lib/format";

export interface PickableContact {
  id: string;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  peer_user_id: string | null;
  peer_orbit_id?: string | null;
}

interface ContactPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectEasyLocsUser: (contact: PickableContact) => void;
  onInviteContact?: (contact: PickableContact) => void;
  onCreatePaymentLink?: () => void;
}

export function ContactPickerSheet({
  open,
  onOpenChange,
  onSelectEasyLocsUser,
  onInviteContact,
  onCreatePaymentLink,
}: ContactPickerSheetProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [contacts, setContacts] = useState<PickableContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadContacts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const raw = await listOrbitContacts(user.id);
      setContacts(
        raw.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          display_name: (c.display_name as string) || null,
          phone: (c.phone as string) || null,
          avatar_url: (c.avatar_url as string) || null,
          peer_user_id: (c.peer_user_id as string) || null,
          peer_orbit_id: (c.peer_orbit_id as string) || null,
        }))
      );
    } catch {
      toast.error(t("wallet.contactLoadError") || "Could not load contacts");
    } finally {
      setLoading(false);
    }
  }, [user?.id, t]);

  useEffect(() => {
    if (open) {
      loadContacts();
      setSearch("");
    }
  }, [open, loadContacts]);

  const easyLocsContacts = useMemo(() => {
    const available = contacts.filter((c) => c.peer_user_id);
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter(
      (c) =>
        c.display_name?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [contacts, search]);

  const phoneOnlyContacts = useMemo(() => {
    const notOnPlatform = contacts.filter((c) => !c.peer_user_id && c.phone);
    if (!search.trim()) return notOnPlatform;
    const q = search.toLowerCase();
    return notOnPlatform.filter(
      (c) =>
        c.display_name?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [contacts, search]);

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] p-0">
        <div className="px-4 pt-5 pb-3">
          <h3 className="text-base font-bold text-foreground">
            {t("wallet.selectContact") || "Select Contact"}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t("wallet.contactPickerSubtitle") || "Choose from your contacts"}
          </p>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("wallet.searchByNamePhone") || "Search by name or phone…"}
              className="w-full rounded-xl border border-border/20 bg-muted/30 pl-9 pr-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh] px-2 pb-6">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {t("wallet.loadingContacts") || "Loading contacts…"}
              </p>
            </div>
          ) : (
            <>
              {easyLocsContacts.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "hsl(38 65% 56% / 0.15)" }}
                    >
                      <CheckCircle
                        className="w-3 h-3"
                        style={{ color: "hsl(38 65% 56%)" }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {t("wallet.onEasyLocs") || "On Easy Locs"}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "hsl(38 65% 56% / 0.12)",
                        color: "hsl(38 65% 56%)",
                      }}
                    >
                      {easyLocsContacts.length}
                    </span>
                  </div>
                  {easyLocsContacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onSelectEasyLocsUser(c)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl active:bg-muted/50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 relative"
                        style={{ background: "hsl(38 65% 56% / 0.1)" }}
                      >
                        {c.avatar_url ? (
                          <img
                            src={c.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span
                            className="text-xs font-bold"
                            style={{ color: "hsl(38 65% 56%)" }}
                          >
                            {c.display_name
                              ? initials(c.display_name)
                              : "?"}
                          </span>
                        )}
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-background"
                          style={{ background: "hsl(142 71% 45%)" }}
                        >
                          <CheckCircle className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-1 break-words">
                          {c.display_name || "Contact"}
                        </p>
                        {c.phone && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {c.phone}
                          </p>
                        )}
                      </div>
                      <span
                        className="text-[9px] font-bold px-2 py-1 rounded-full shrink-0"
                        style={{
                          background: "hsl(142 71% 45% / 0.1)",
                          color: "hsl(142 71% 45%)",
                        }}
                      >
                        {t("wallet.available") || "Available"}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {phoneOnlyContacts.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-muted/50">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {t("wallet.phoneContacts") || "Phone Contacts"}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                      {phoneOnlyContacts.length}
                    </span>
                  </div>
                  {phoneOnlyContacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onInviteContact?.(c)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl active:bg-muted/50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                        {c.avatar_url ? (
                          <img
                            src={c.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">
                            {c.display_name
                              ? initials(c.display_name)
                              : "?"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-1 break-words">
                          {c.display_name || "Contact"}
                        </p>
                        {c.phone && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {c.phone}
                          </p>
                        )}
                      </div>
                      <span className="text-[9px] font-bold px-2 py-1 rounded-full shrink-0 bg-muted/50 text-muted-foreground">
                        {t("wallet.invite") || "Invite"}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {onCreatePaymentLink && (
                <button
                  onClick={onCreatePaymentLink}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl active:bg-muted/50 transition-colors text-left mt-2 border border-dashed border-border/30"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "hsl(220 40% 18% / 0.08)" }}
                  >
                    <Link2
                      className="w-4 h-4"
                      style={{ color: "hsl(220 40% 18%)" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {t("wallet.createPaymentLink") || "Create Payment Link"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t("wallet.paymentLinkDesc") || "Share a link anyone can use to pay you"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                </button>
              )}

              {easyLocsContacts.length === 0 &&
                phoneOnlyContacts.length === 0 &&
                !loading && (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
                      <Users className="w-7 h-7 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("wallet.noContacts") || "No contacts found"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 text-center max-w-[240px]">
                      {t("wallet.syncContactsHint") || "Sync your phone contacts to find people on Easy Locs"}
                    </p>
                  </div>
                )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function InviteContactSheet({
  open,
  onOpenChange,
  contact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: PickableContact | null;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { balance, currency } = useWalletBalance();
  const [mode, setMode] = useState<"invite" | "send">("invite");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);

  if (!contact) return null;

  const shareInvite = () => {
    const message = t("wallet.inviteMessage") || `Hey! Join me on Easy Locs to send and receive money instantly. Download now!`;
    if (navigator.share) {
      navigator.share({
        title: "Easy Locs",
        text: message,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(message).then(() => {
        toast.success(t("wallet.inviteCopied") || "Invite message copied!");
      }).catch(() => {});
    }
    onOpenChange(false);
  };

  const handleSendWithInvite = async () => {
    if (!user?.id || !contact.phone) return;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error(t("wallet.invalidAmount") || "Enter a valid amount");
      return;
    }
    if (numAmount > balance) {
      toast.error(t("wallet.insufficient") || "Insufficient balance");
      return;
    }

    setSending(true);
    try {
      const senderName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Someone";
      const link = await createInvitePaymentLink({
        senderId: user.id,
        recipientPhone: contact.phone,
        recipientName: contact.display_name || "Friend",
        amount: numAmount,
        currency: currency || "AED",
      });

      const message = generateShareMessage(link, senderName);

      if (navigator.share) {
        await navigator.share({ title: "Easy Locs Payment", text: message }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(message).catch(() => {});
        toast.success(t("wallet.linkCopied") || "Payment link copied!");
      }

      toast.success(t("wallet.invitePaymentSent") || "Payment link created! They'll receive the money after signing up.");
      onOpenChange(false);
      setAmount("");
      setMode("invite");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create payment link");
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl p-0">
        <div className="px-5 pt-6 pb-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
              <UserPlus className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">
                {contact.display_name || "Contact"}
              </p>
              {contact.phone && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {contact.phone}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              {t("wallet.notOnEasyLocs") || "This contact isn't on Easy Locs yet. Invite them to send money directly."}
            </p>

            {mode === "send" && contact.phone ? (
              <div className="w-full space-y-3">
                <div className="rounded-2xl bg-card border border-border/10 p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-sm text-muted-foreground font-bold">{currency || "AED"}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      autoFocus
                      className="text-3xl font-extrabold text-foreground text-center bg-transparent outline-none w-[120px] tabular-nums"
                      style={{ WebkitAppearance: "none", MozAppearance: "textfield" } as React.CSSProperties}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t("wallet.pendingUntilSignup") || "Payment held until they sign up"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {[25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(String(preset))}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                      style={{
                        background: parseFloat(amount) === preset ? "hsl(38 65% 56%)" : "hsl(var(--muted) / 0.5)",
                        color: parseFloat(amount) === preset ? "hsl(220 40% 18%)" : "hsl(var(--foreground))",
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleSendWithInvite}
                  disabled={sending || !parseFloat(amount)}
                  className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-50"
                  style={{ background: "hsl(38 65% 56%)", color: "hsl(220 40% 18%)" }}
                >
                  <Send className="w-4 h-4" />
                  {sending
                    ? (t("wallet.creating") || "Creating…")
                    : parseFloat(amount) > 0
                      ? `${t("wallet.inviteAndSend") || "Invite & Send"} ${formatMoney(parseFloat(amount), currency || "AED")}`
                      : (t("wallet.enterAmount") || "Enter amount")}
                </button>
                <button
                  onClick={() => setMode("invite")}
                  className="text-xs text-muted-foreground font-medium"
                >
                  {t("wallet.justInvite") || "Just invite without payment"}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={shareInvite}
                  className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                  style={{ background: "hsl(38 65% 56%)", color: "hsl(220 40% 18%)" }}
                >
                  <UserPlus className="w-4 h-4" />
                  {t("wallet.inviteToEasyLocs") || "Invite to Easy Locs"}
                </button>
                {contact.phone && (
                  <button
                    onClick={() => setMode("send")}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform border border-border/30"
                    style={{ background: "hsl(var(--card))" }}
                  >
                    <Wallet className="w-4 h-4" style={{ color: "hsl(38 65% 56%)" }} />
                    {t("wallet.inviteAndSendMoney") || "Invite & Send Money"}
                  </button>
                )}
                <button
                  onClick={() => onOpenChange(false)}
                  className="text-sm text-muted-foreground font-medium"
                >
                  {t("common.cancel") || "Cancel"}
                </button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
