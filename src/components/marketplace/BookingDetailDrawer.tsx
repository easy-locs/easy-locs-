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
import BookingStatusBadge from "./BookingStatusBadge";
import BookingCommunicationThread from "./BookingCommunicationThread";
import BookingActivityLog from "./BookingActivityLog";

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
}

export default function BookingDetailDrawer({
  open, onOpenChange, booking, service, provider, orgId,
  onUpdateStatus, onSendPaymentLink, onConfirmPayment, onGenerateInvoice,
}: Props) {
  if (!booking) return null;

  const status = booking.status || "pending";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            <ClipboardList className="h-5 w-5 text-accent" />
            Booking #{booking.id?.slice(0, 8)}
          </SheetTitle>
          <BookingStatusBadge status={status} />
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
      </SheetContent>
    </Sheet>
  );
}
