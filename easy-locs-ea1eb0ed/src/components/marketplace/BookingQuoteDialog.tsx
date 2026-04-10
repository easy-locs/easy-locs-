/**
 * BookingQuoteDialog — allows providers to send a custom quote
 * before confirming a booking. Updates total_price and notifies the customer.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  booking: any;
  service: any;
  onSubmit: (data: { quoted_price: number; quote_message: string }) => void;
  isPending?: boolean;
}

export default function BookingQuoteDialog({ open, onOpenChange, booking, service, onSubmit, isPending }: Props) {
  const [quotedPrice, setQuotedPrice] = useState(Number(booking?.total_price || 0));
  const [quoteMessage, setQuoteMessage] = useState("");

  if (!booking) return null;

  const currency = service?.currency || booking?.currency || "EUR";
  const originalPrice = Number(booking?.total_price || 0);
  const hasChanged = quotedPrice !== originalPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-accent" />
            Send Quote
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Booking summary */}
          <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-1">
            <p className="font-medium text-foreground">{booking.booker_name}</p>
            <p className="text-muted-foreground">{service?.title || "Service"}</p>
            <p className="text-muted-foreground">
              Requested: {originalPrice.toLocaleString()} {currency}
            </p>
          </div>

          {/* Quoted price */}
          <div>
            <Label className="text-xs">Your Quote ({currency})</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              className="h-10 text-lg font-bold"
              value={quotedPrice || ""}
              onChange={(e) => setQuotedPrice(Number(e.target.value) || 0)}
            />
            {hasChanged && (
              <p className="text-xs text-accent mt-1">
                {quotedPrice > originalPrice ? "▲" : "▼"} {Math.abs(quotedPrice - originalPrice).toLocaleString()} {currency} vs original
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <Label className="text-xs">Message to customer</Label>
            <Textarea
              className="text-sm min-h-[60px]"
              value={quoteMessage}
              onChange={(e) => setQuoteMessage(e.target.value)}
              placeholder="Details about the quote, included services..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!quotedPrice || isPending}
              onClick={() => onSubmit({ quoted_price: quotedPrice, quote_message: quoteMessage })}
            >
              {isPending ? "Sending..." : "Send Quote"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
