/**
 * HotelCheckout — Booking checkout page with unified payment pipeline.
 * Pipeline: fraud check → create booking → Stripe intent → card payment → webhook confirmation → notification.
 */
import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useMemo, useRef, useCallback, lazy, Suspense } from "react";
import SubPageShell from "@/components/layout/SubPageShell";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHotelDetail } from "@/hooks/useHotelDetail";
import { useAuth } from "@/contexts/AuthContext";
import type { HotelBooking } from "@/domains/hotel/ports";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { executeWalletTransfer } from "@/lib/wallet/wallet-transfer";
import { preTransactionCheck, postTransactionRecord } from "@/lib/security/anti-fraud-guard";
import { resolveEntityOwner } from "@/lib/radar/owner-resolver";
import { db } from "@/services/db";
import { resolveDisplayCurrency, formatMoneyByCountry } from "@/lib/currency-engine";
import { logger } from "@/lib/monitoring";
import { format, differenceInDays } from "date-fns";
import {
  Star, MapPin, BedDouble, Users, CalendarDays, Shield, Coffee,
  CheckCircle2, AlertCircle, Loader2, CreditCard, Wallet, Banknote,
  AlertTriangle, ShieldCheck, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";
import { createHotelService } from "@/domains/hotel/service";

const CardPayment = lazy(() => import("@/components/payments/CardPayment"));
const AppleGooglePayButton = lazy(() => import("@/components/payments/AppleGooglePayButton"));

type PaymentMethod = "card" | "wallet" | "cash";
type CheckoutStep = "review" | "card_payment" | "processing" | "confirmed";

export default function HotelCheckout() {
  useUiEngine("travel-hotelcheckout");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const hotelId = params.get("hotel") ?? "";
  const roomId = params.get("room") ?? "";
  const ratePlanId = params.get("plan") ?? "";
  const checkIn = params.get("checkin") ?? "";
  const checkOut = params.get("checkout") ?? "";
  const adults = parseInt(params.get("adults") ?? "2", 10);
  const children = parseInt(params.get("children") ?? "0", 10);

  const { data: hotel, isLoading } = useHotelDetail(hotelId);
  const [bookingResult, setBookingResult] = useState<HotelBooking | null>(null);
  const [step, setStep] = useState<CheckoutStep>("review");
  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const idempotencyRef = useRef(crypto.randomUUID());

  const { rows: walletAccounts } = useWalletAccounts(user?.id);
  const primaryWallet = walletAccounts.find((w) => w.is_default) || walletAccounts[0];
  const walletBalance = primaryWallet
    ? ((primaryWallet as { balance_cash?: number; balance?: number }).balance_cash ?? primaryWallet.balance ?? 0)
    : 0;

  const cur = resolveDisplayCurrency({ country: "AE" });
  const fmt = (n: number) => formatMoneyByCountry(n, null, cur);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return differenceInDays(new Date(checkOut), new Date(checkIn));
  }, [checkIn, checkOut]);

  const room = useMemo(() => hotel?.rooms.find(r => r.id === roomId), [hotel, roomId]);
  const ratePlan = useMemo(() => room?.rate_plans.find(p => p.id === ratePlanId), [room, ratePlanId]);

  const priceBreakdown = useMemo(() => {
    if (!room || !checkIn || !checkOut || nights <= 0) return null;
    let totalBase = 0, totalTaxes = 0, totalFees = 0, totalFinal = 0;
    const nightlyPrices: Array<{ date: string; price: number }> = [];

    for (let d = 0; d < nights; d++) {
      const dateStr = format(new Date(new Date(checkIn).getTime() + d * 86400000), "yyyy-MM-dd");
      const day = room.availability.find(a => a.date === dateStr);
      if (!day || !day.available) return null;
      totalBase += day.base_price;
      totalTaxes += day.taxes_amount;
      totalFees += day.fees_amount;
      totalFinal += day.final_price || day.base_price;
      nightlyPrices.push({ date: dateStr, price: day.final_price || day.base_price });
    }
    return { totalBase, totalTaxes, totalFees, totalFinal, nightlyPrices, ppn: Math.round(totalFinal / nights) };
  }, [room, checkIn, checkOut, nights]);

  const grandTotal = priceBreakdown?.totalFinal ?? 0;
  const walletInsufficient = payment === "wallet" && walletBalance < grandTotal;

  const runFraudCheck = useCallback(() => {
    if (!user) return { pass: false, reason: "not_authenticated", idempotencyKey: "" };
    return preTransactionCheck(user.id, "payment", {
      hotelId,
      roomId,
      amount: grandTotal,
      type: "hotel_booking",
      fingerprint: `hotel:${hotelId}:${roomId}:${checkIn}:${checkOut}`,
    });
  }, [user, hotelId, roomId, grandTotal, checkIn, checkOut]);

  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const pendingBookingRef = useRef<HotelBooking | null>(null);

  const createPendingBooking = useCallback(async (): Promise<HotelBooking> => {
    if (pendingBookingId && pendingBookingRef.current) return pendingBookingRef.current;
    if (!user) throw new Error("Not authenticated");

    const service = createHotelService({ userId: user.id });

    const availCheck = await service.checkAvailability(hotelId, roomId, checkIn, checkOut, adults + children, ratePlanId || undefined);
    if (!availCheck.ok) {
      throw new Error("Unable to verify room availability. Please try again.");
    }
    if (!availCheck.data.available) {
      throw new Error("This room was just booked by someone else. Please choose another date or room.");
    }

    const result = await service.createBooking({
      hotelId,
      roomTypeId: roomId,
      ratePlanId: ratePlanId || undefined,
      checkIn,
      checkOut,
      adults,
      children,
      guestInfo: {
        name: user.user_metadata?.full_name ?? user.email ?? "Guest",
        email: user.email ?? "",
      },
    });

    if (!result.ok) {
      if (result.error?.includes("available") || result.error?.includes("booked")) {
        throw new Error("This room is no longer available. Please choose another date or room.");
      }
      throw new Error(result.error ?? "Booking failed. Please try again.");
    }

    setPendingBookingId(result.data.id);
    pendingBookingRef.current = result.data;
    logger.info("[HotelCheckout] Pending booking created", {
      bookingId: result.data.id,
      reference: result.data.bookingReference,
    });
    return result.data;
  }, [pendingBookingId, user, hotelId, roomId, ratePlanId, checkIn, checkOut, adults, children]);

  const handleConfirmBooking = async () => {
    if (!user) {
      toast.error("Please sign in to book");
      navigate("/login");
      return;
    }
    if (!priceBreakdown) return;
    if (placing) return;

    setPaymentError(null);

    const fraudCheck = runFraudCheck();
    if (!fraudCheck.pass) {
      toast.error(`Booking blocked: ${fraudCheck.reason}`);
      logger.warn("[HotelCheckout] Fraud check failed", { reason: fraudCheck.reason });
      return;
    }

    setPlacing(true);
    try {
      const pending = await createPendingBooking();
      postTransactionRecord(fraudCheck.idempotencyKey, { bookingId: pending.id });

      if (payment === "card") {
        setPlacing(false);
        setStep("card_payment");
        return;
      }

      if (payment === "wallet") {
        if (walletInsufficient) {
          toast.error(`Insufficient wallet balance. Available: ${fmt(walletBalance)}, Required: ${fmt(grandTotal)}`);
          setPlacing(false);
          return;
        }

        logger.info("[HotelCheckout] Starting wallet payment", { amount: grandTotal, currency: cur, bookingId: pending.id });

        const hotelOwner = await resolveEntityOwner(hotelId, "hotel");
        if (!hotelOwner?.ownerUserId) {
          throw new Error("Unable to resolve hotel payment recipient — please use card payment instead");
        }

        const transferResult = await executeWalletTransfer({
          senderUserId: user.id,
          receiverUserId: hotelOwner.ownerUserId,
          amount: grandTotal,
          currency: cur,
          description: `Hotel booking: ${hotel?.name} (${checkIn} - ${checkOut})`,
          transactionType: "hotel_booking",
          idempotencyKey: idempotencyRef.current,
        });

        if (!transferResult.success) {
          throw new Error(transferResult.error || "Wallet payment failed");
        }

        await db.from("hotel_bookings").update({
          payment_status: "paid",
          status: "confirmed",
          wallet_transaction_id: transferResult.transactionId || null,
          updated_at: new Date().toISOString(),
        }).eq("id", pending.id);

        setBookingResult(pending);
        setStep("confirmed");
        toast.success("Booking confirmed! Ref: " + pending.bookingReference);
        idempotencyRef.current = crypto.randomUUID();
      } else {
        setBookingResult(pending);
        setStep("confirmed");
        toast.success("Booking submitted! Pay at hotel. Ref: " + pending.bookingReference);
        idempotencyRef.current = crypto.randomUUID();
      }
    } catch (err: any) {
      const msg = err.message || "Booking failed";
      setPaymentError(msg);
      logger.error("[HotelCheckout] Payment error", { error: msg, method: payment });
      toast.error(msg);
    } finally {
      setPlacing(false);
    }
  };

  const handleCardPaymentSuccess = async (paymentIntentId: string) => {
    setStep("processing");
    setPlacing(true);
    setPaymentError(null);

    const pending = pendingBookingRef.current;

    logger.info("[HotelCheckout] Card payment confirmed via Stripe", {
      paymentIntentId,
      bookingId: pendingBookingId,
      amount: grandTotal,
    });

    if (pendingBookingId && pending) {
      toast.success("Payment received! Confirming your booking...");
      idempotencyRef.current = crypto.randomUUID();
      setPlacing(false);
      navigate(`/order/receipt/hotel-${pendingBookingId}`, { replace: true });
    } else {
      logger.critical("[HOTEL_CHECKOUT_RECOVERY] Payment captured but no pending booking reference", {
        paymentIntentId,
        amount: grandTotal,
        currency: cur,
        userId: user?.id,
      });
      setPaymentError(
        "Your payment was processed but we had trouble locating the booking. " +
        "Your funds are safe — please contact support with reference: " + paymentIntentId
      );
      toast.error("Booking reference issue — your payment is safe. Please contact support.");
      setStep("review");
      setPlacing(false);
    }
  };

  const handleCardPaymentError = (error: string) => {
    setPaymentError(error);
    logger.error("[HotelCheckout] Card payment failed", { error });
  };

  const paymentMethods: { key: PaymentMethod; label: string; icon: typeof Wallet; detail?: string }[] = [
    { key: "card", label: "Card", icon: CreditCard, detail: "Visa, Mastercard, Apple Pay, Google Pay" },
    {
      key: "wallet",
      label: "Wallet",
      icon: Wallet,
      detail: primaryWallet ? `Balance: ${fmt(walletBalance)}` : "Not set up",
    },
    { key: "cash", label: "Pay at Hotel", icon: Banknote, detail: "Pay upon check-in" },
  ];

  if (isLoading) {
    return (
      <SubPageShell noContentPad>
        <MobilePageHeader title="Checkout" backTo={`/travel/hotel/${hotelId}`} />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </SubPageShell>
    );
  }

  if (!hotel || !room) {
    return (
      <SubPageShell noContentPad>
        <MobilePageHeader title="Checkout" backTo="/travel/stays" />
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">Invalid booking details</p>
        </div>
      </SubPageShell>
    );
  }

  if (step === "card_payment") {
    return (
      <SubPageShell noContentPad>
        <header className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={() => { setStep("review"); setPaymentError(null); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Secure Payment</h1>
        </header>

        <div className="flex-1 px-4 pb-8 space-y-4">
          <div className="rounded-2xl p-4 bg-card border border-border/20">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <span className="text-xs font-semibold text-green-400">Secure payment via Stripe</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Total to pay</span>
              <span className="text-xl font-bold text-foreground">{fmt(grandTotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {hotel.name} — {nights} night{nights > 1 ? "s" : ""} ({format(new Date(checkIn), "MMM d")} - {format(new Date(checkOut), "MMM d")})
            </p>
          </div>

          {paymentError && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{paymentError}</span>
            </div>
          )}

          <div className="rounded-2xl p-4 bg-card border border-border/20 mb-3">
            <Suspense fallback={null}>
              <AppleGooglePayButton
                amount={grandTotal}
                currency={cur}
                label={hotel.name || "Hotel Booking"}
                metadata={{
                  type: "hotel_booking",
                  hotel_booking_id: pendingBookingId || "",
                  hotel_id: hotelId,
                  user_id: user?.id || "",
                  amount: String(grandTotal),
                  currency: cur,
                }}
                onSuccess={handleCardPaymentSuccess}
                onError={handleCardPaymentError}
              />
            </Suspense>
          </div>

          <div className="rounded-2xl p-4 bg-card border border-border/20">
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3 text-muted-foreground">
              Enter card details
            </p>
            <Suspense
              fallback={
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading payment form...
                </div>
              }
            >
              <CardPayment
                amount={grandTotal}
                currency={cur}
                metadata={{
                  type: "hotel_booking",
                  hotel_booking_id: pendingBookingId || "",
                  hotel_id: hotelId,
                  user_id: user?.id || "",
                  amount: String(grandTotal),
                  currency: cur,
                }}
                onSuccess={handleCardPaymentSuccess}
                onError={handleCardPaymentError}
              />
            </Suspense>
          </div>
        </div>
      </SubPageShell>
    );
  }

  if (step === "processing") {
    return (
      <SubPageShell noContentPad className="flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-foreground">Confirming your booking...</p>
        <p className="text-xs text-muted-foreground">Payment confirmed. Please wait.</p>
      </SubPageShell>
    );
  }

  if (step === "confirmed" && bookingResult) {
    return (
      <SubPageShell noContentPad>
        <MobilePageHeader title="Booking Submitted" backTo="/travel/stays" />
        <div className="px-4 py-8 space-y-6">
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="h-16 w-16 text-success mb-4" />
            <h1 className="text-xl font-bold text-foreground">Booking Confirmed!</h1>
            <p className="text-sm text-muted-foreground mt-1">Your reservation is secured</p>
          </div>

          <div className="rounded-2xl border border-border/15 bg-card/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Reference</span>
              <span className="text-sm font-bold text-primary">{bookingResult.bookingReference}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Hotel</span>
              <span className="text-sm font-semibold text-foreground">{hotel.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Room</span>
              <span className="text-sm text-foreground">{room.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Dates</span>
              <span className="text-sm text-foreground">
                {format(new Date(checkIn), "MMM d")} - {format(new Date(checkOut), "MMM d")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Nights</span>
              <span className="text-sm text-foreground">{nights}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Payment</span>
              <span className="text-sm text-foreground capitalize">{payment === "cash" ? "Pay at Hotel" : payment}</span>
            </div>
            <div className="border-t border-border/10 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-lg font-extrabold text-foreground tabular-nums">
                  {bookingResult.currency} {bookingResult.totalPrice.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button className="w-full font-bold" onClick={() => navigate(`/order/receipt/hotel-${bookingResult.id}`)}>
              View Receipt
            </Button>
            <Button variant="outline" className="w-full font-bold" onClick={() => navigate("/travel/stays")}>
              Back to Hotels
            </Button>
          </div>
        </div>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Review & Book" backTo={`/travel/hotel/${hotelId}`} />

      <div className="px-4 space-y-4 mt-4 pb-28">
        <div className="flex gap-3 p-3 rounded-2xl border border-border/15 bg-card/80">
          {hotel.cover_image && (
            <img loading="lazy" src={hotel.cover_image} alt={hotel.name} className="w-20 h-20 rounded-xl object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              {Array.from({ length: hotel.stars }, (_, i) => (
                <Star key={i} className="h-3 w-3 fill-warning text-warning" />
              ))}
            </div>
            <h2 className="text-sm font-bold text-foreground break-words">{hotel.name}</h2>
            <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <MapPin className="h-3 w-3" /> {hotel.city}, {hotel.country}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/15 bg-card/80 p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">Stay Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Check-in</p>
                <p className="text-xs font-semibold text-foreground">{format(new Date(checkIn), "EEE, MMM d")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Check-out</p>
                <p className="text-xs font-semibold text-foreground">{format(new Date(checkOut), "EEE, MMM d")}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {adults} adults{children > 0 && `, ${children} children`}</span>
            <span>{nights} night{nights > 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/15 bg-card/80 p-4 space-y-2">
          <h3 className="text-sm font-bold text-foreground">Room</h3>
          <div className="flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground font-medium">{room.name}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>{room.capacity} guests max</span>
            <span>{room.bed_type}</span>
            {room.size_m2 && <span>{room.size_m2}m2</span>}
          </div>
        </div>

        {ratePlan && (
          <div className="rounded-2xl border border-border/15 bg-card/80 p-4 space-y-2">
            <h3 className="text-sm font-bold text-foreground">Rate Plan</h3>
            <p className="text-sm text-foreground">{ratePlan.name}</p>
            <div className="flex flex-wrap gap-1.5">
              {ratePlan.refundable ? (
                <Badge variant="outline" className="text-[10px] border-success/30 text-success">
                  <Shield className="h-3 w-3 mr-0.5" /> Free Cancellation
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                  Non-refundable
                </Badge>
              )}
              {ratePlan.includes_breakfast && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                  <Coffee className="h-3 w-3 mr-0.5" /> Breakfast
                </Badge>
              )}
            </div>
          </div>
        )}

        {priceBreakdown ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <h3 className="text-sm font-bold text-foreground">Price Breakdown</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{nights} night{nights > 1 ? "s" : ""} x AED {priceBreakdown.ppn}/night</span>
                <span className="text-foreground tabular-nums">AED {priceBreakdown.totalBase.toFixed(2)}</span>
              </div>
              {priceBreakdown.totalTaxes > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Taxes</span>
                  <span className="text-foreground tabular-nums">AED {priceBreakdown.totalTaxes.toFixed(2)}</span>
                </div>
              )}
              {priceBreakdown.totalFees > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Fees</span>
                  <span className="text-foreground tabular-nums">AED {priceBreakdown.totalFees.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border/10 pt-2 flex justify-between">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-lg font-extrabold text-foreground tabular-nums">
                  AED {priceBreakdown.totalFinal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-4 w-4" /> Room not available for selected dates
            </p>
          </div>
        )}

        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2 text-muted-foreground">Payment Method</p>
          <div className="space-y-2">
            {paymentMethods.map((pm) => (
              <button
                key={pm.key}
                onClick={() => setPayment(pm.key)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.98] transition-all"
                style={{
                  background: payment === pm.key ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                  border: `1px solid ${payment === pm.key ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border) / 0.12)"}`,
                }}
              >
                <pm.icon
                  className="w-5 h-5"
                  style={{ color: payment === pm.key ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
                />
                <div className="flex-1 text-left">
                  <span className="text-sm font-semibold text-foreground">{pm.label}</span>
                  {pm.detail && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{pm.detail}</p>
                  )}
                </div>
                {pm.key === "wallet" && walletInsufficient && (
                  <span className="text-[10px] font-semibold text-destructive">Insufficient</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {paymentError && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-xl px-3 py-2.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">{paymentError}</span>
          </div>
        )}
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 z-40">
        <Button
          className="w-full font-bold h-12 text-sm"
          disabled={!priceBreakdown || placing || walletInsufficient}
          onClick={handleConfirmBooking}
        >
          {placing ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
          ) : !priceBreakdown ? (
            "Unavailable"
          ) : payment === "card" ? (
            `Continue to Payment - AED ${priceBreakdown.totalFinal.toFixed(2)}`
          ) : payment === "wallet" ? (
            `Pay with Wallet - AED ${priceBreakdown.totalFinal.toFixed(2)}`
          ) : (
            `Confirm & Pay at Hotel - AED ${priceBreakdown.totalFinal.toFixed(2)}`
          )}
        </Button>
      </div>
    </SubPageShell>
  );
}
