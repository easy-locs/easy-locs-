import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, X, Send, CreditCard, FileText, Edit, RefreshCw,
  MessageCircle, Mail, Clock, User, MapPin, Calendar, DollarSign,
  ClipboardList, History,
} from "lucide-react";
import { format } from "date-fns";
import { signBookingDocumentUrl } from "@/repositories/rental.repository";
import BookingStatusBadge from "./BookingStatusBadge";
import BookingCommunicationThread from "./BookingCommunicationThread";
import BookingActivityLog from "./BookingActivityLog";
import BookingModifyDialog from "./BookingModifyDialog";
import BookingQuoteDialog from "./BookingQuoteDialog";

function IdDocumentCard({ booking }: { booking: any }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!booking.id_document_url) return;
    const path = booking.id_document_url;
    if (path.startsWith("http")) {
      setSignedUrl(path);
      return;
    }
    signBookingDocumentUrl(path)
      .then((url) => {
        if (url) setSignedUrl(url);
      });
  }, [booking.id_document_url]);

  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" /> Identity Document
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Client</p>
            <p className="font-medium text-foreground">{booking.booker_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Booking Ref</p>
            <p className="font-medium text-foreground">#{booking.id?.slice(0, 8)}</p>
          </div>
          {booking.id_document_type && (
            <div>
              <p className="text-muted-foreground text-xs">Document Type</p>
              <p className="font-medium text-foreground capitalize">{booking.id_document_type}</p>
            </div>
          )}
        </div>
        {signedUrl && (
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-1"
          >
            <FileText className="h-3 w-3" /> View Document
          </a>
        )}
      </CardContent>
    </Card>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  service: any;
  provider: any;
  orgId: string;
  onUpdateStatus: (id: string, status: string) => void;
  onSendPaymentLink: (booking: any) => void;
  onConfirmPayment: (id: string) => void;
  onGenerateInvoice?: (booking: any) => void;
  onModifyBooking?: (booking: any, changes: any) => Promise<boolean>;
  onSendQuote?: (booking: any, data: { quoted_price: number; quote_message: string }) => Promise<boolean>;
}

export default function BookingDetailDrawer({
  open, onOpenChange, booking, service, provider, orgId,
  onUpdateStatus, onSendPaymentLink, onConfirmPayment, onGenerateInvoice, onModifyBooking, onSendQuote,
}: Props) {
  const [modifyOpen, setModifyOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  if (!booking) return null;


  const status = booking.status || "pending";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base">Booking #{booking.id?.slice(0, 8)}</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{booking.booker_name} • {service?.title || "Service"}</p>
            </div>
            <BookingStatusBadge status={status} />
          </div>
        </SheetHeader>

        <Tabs defaultValue="summary" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="flex-1 text-xs">Summary</TabsTrigger>
            <TabsTrigger value="communication" className="flex-1 text-xs">Messages</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 text-xs">Activity</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4 mt-4">
            {/* Customer Info */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-accent" /> Customer
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Name</p>
                    <p className="font-medium text-foreground">{booking.booker_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Email</p>
                    <p className="font-medium text-foreground">{booking.booker_email}</p>
                  </div>
                  {booking.booker_phone && (
                    <div>
                      <p className="text-muted-foreground text-xs">Phone</p>
                      <p className="font-medium text-foreground">{booking.booker_phone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Service Info */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-accent" /> Service
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Service</p>
                    <p className="font-medium text-foreground">{service?.title || "Service"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Date</p>
                    <p className="font-medium text-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {booking.service_date || booking.date_from || "—"}
                    </p>
                  </div>
                  {booking.service_time && (
                    <div>
                      <p className="text-muted-foreground text-xs">Time</p>
                      <p className="font-medium text-foreground">{booking.service_time}</p>
                    </div>
                  )}
                  {booking.date_from && booking.date_to && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Period</p>
                      <p className="font-medium text-foreground">{booking.date_from} → {booking.date_to}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground text-xs">Quantity</p>
                    <p className="font-medium text-foreground">{booking.quantity || 1}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-accent" /> Payment
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-foreground tabular-nums">
                    {Number(booking.total_price).toLocaleString()} {booking.currency}
                  </span>
                  {booking.payment_confirmed && (
                    <span className="text-xs text-accent font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Paid
                    </span>
                  )}
                </div>
                {booking.payment_method && (
                  <p className="text-xs text-muted-foreground">Method: {booking.payment_method}</p>
                )}
                {booking.payment_link_sent && (
                  <p className="text-xs text-muted-foreground">Payment link sent ✓</p>
                )}
              </CardContent>
            </Card>

            {/* Customer Notes */}
            {booking.notes && (
              <Card>
                <CardContent className="pt-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1">Customer Message</h3>
                  <p className="text-sm text-muted-foreground italic">"{booking.notes}"</p>
                </CardContent>
              </Card>
            )}

            {/* ID Documents */}
            {booking.id_document_url && (
              <IdDocumentCard booking={booking} />
            )}

            <Separator />

            {/* Action Panel */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {(status === "new" || status === "pending") && (
                  <>
                    <Button size="sm" onClick={() => onUpdateStatus(booking.id, "confirmed")} className="w-full">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Validate
                    </Button>
                    {onSendQuote && (
                      <Button size="sm" variant="outline" onClick={() => setQuoteOpen(true)} className="w-full">
                        <DollarSign className="h-3 w-3 mr-1" /> Send Quote
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => onUpdateStatus(booking.id, "awaiting_payment")} className="w-full">
                      <CreditCard className="h-3 w-3 mr-1" /> Await Payment
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onUpdateStatus(booking.id, "cancelled")} className="w-full">
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                  </>
                )}
                {status === "awaiting_payment" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onSendPaymentLink(booking)} className="w-full">
                      <Send className="h-3 w-3 mr-1" /> Send Payment Link
                    </Button>
                    <Button size="sm" onClick={() => onConfirmPayment(booking.id)} className="w-full">
                      <CreditCard className="h-3 w-3 mr-1" /> Mark Paid
                    </Button>
                  </>
                )}
                {status === "confirmed" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onSendPaymentLink(booking)} className="w-full">
                      <Send className="h-3 w-3 mr-1" /> Payment Link
                    </Button>
                    {!booking.payment_confirmed && (
                      <Button size="sm" variant="outline" onClick={() => onConfirmPayment(booking.id)} className="w-full">
                        <CreditCard className="h-3 w-3 mr-1" /> Confirm Pay
                      </Button>
                    )}
                    <Button size="sm" onClick={() => onUpdateStatus(booking.id, "completed")} className="w-full">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onUpdateStatus(booking.id, "cancelled")} className="w-full">
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                  </>
                )}
                {/* Modify — available for pending, confirmed, modified */}
                {(status === "pending" || status === "new" || status === "confirmed" || status === "modified") && onModifyBooking && (
                  <Button size="sm" variant="outline" onClick={() => setModifyOpen(true)} className="w-full">
                    <Edit className="h-3 w-3 mr-1" /> Modify
                  </Button>
                )}
                {status === "completed" && booking.payment_confirmed && (
                  <Button size="sm" variant="outline" onClick={() => onUpdateStatus(booking.id, "refunded")} className="w-full">
                    <RefreshCw className="h-3 w-3 mr-1" /> Refund
                  </Button>
                )}
                {/* Invoice for confirmed/completed/paid */}
                {(status === "confirmed" || status === "completed" || booking.payment_confirmed) && provider?.invoicing_enabled && onGenerateInvoice && (
                  <Button size="sm" variant="outline" onClick={() => onGenerateInvoice(booking)} className="w-full">
                    <FileText className="h-3 w-3 mr-1" /> Invoice
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication" className="mt-4">
            <BookingCommunicationThread
              bookingId={booking.id}
              orgId={orgId}
              customerName={booking.booker_name}
              customerEmail={booking.booker_email}
            />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-4">
            <BookingActivityLog bookingId={booking.id} orgId={orgId} />
          </TabsContent>
        </Tabs>

        {/* Modification Dialog */}
        {onModifyBooking && (
          <BookingModifyDialog
            open={modifyOpen}
            onOpenChange={setModifyOpen}
            booking={booking}
            service={service}
            onSubmit={async (changes) => {
              const ok = await onModifyBooking(booking, changes);
              if (ok) setModifyOpen(false);
            }}
          />
        )}

        {/* Quote Dialog */}
        {onSendQuote && (
          <BookingQuoteDialog
            open={quoteOpen}
            onOpenChange={setQuoteOpen}
            booking={booking}
            service={service}
            onSubmit={async (data) => {
              const ok = await onSendQuote(booking, data);
              if (ok) setQuoteOpen(false);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
