import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategoryInfo } from "./MarketplaceCategories";
import { MapPin, Clock, Users, Star, Share2, Copy, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getShareLinks, sharePage } from "@/lib/social-share";
import { toast } from "sonner";
import ServiceBookingCalendar from "@/components/concierge/ServiceBookingCalendar";

interface Props {
  service: any;
  provider?: any;
  onBook?: () => void;
  onEdit?: () => void;
  showActions?: boolean;
  showCalendar?: boolean;
}

export default function ServiceCard({ service, provider, onBook, onEdit, showActions, showCalendar }: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const cat = getCategoryInfo(service.category);
  const photos = (service.photo_urls || []) as string[];
  const priceLabel = service.price_type === "quote"
    ? "On quote"
    : `${Number(service.price).toLocaleString()} ${service.currency}${service.price_type === "hourly" ? "/h" : service.price_type === "daily" ? "/day" : ""}`;

  const slug = service.booking_slug;
  const links = slug ? getShareLinks("service", slug, service.title) : null;

  const handleShare = async () => {
    if (!slug) { toast.error("No booking slug configured"); return; }
    const result = await sharePage({ type: "service", slug, title: service.title });
    if (result === "copied") toast.success("Link copied!");
    else if (result === "shared") toast.success("Shared!");
  };

  const copyLink = () => {
    if (!links) return;
    navigator.clipboard.writeText(links.copy);
    toast.success("Booking link copied!");
  };

  const timeSlots = Array.isArray(service.time_slots) ? service.time_slots : [];
  const blockedDates = Array.isArray(service.blocked_dates) ? service.blocked_dates : [];

  return (
    <Card className="overflow-hidden hover:border-accent/50 transition-colors group">
      {photos.length > 0 && (
        <div className="aspect-[16/9] bg-muted overflow-hidden">
          <img src={photos[0]} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        </div>
      )}
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{cat.icon}</span>
          <Badge variant="outline" className="text-xs">{cat.label}</Badge>
          {(service.badges || []).map((b: string) => (
            <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>
          ))}
        </div>

        <h3 className="font-semibold text-foreground line-clamp-1">{service.title}</h3>
        {service.description && <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {service.city && (
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {service.city}, {service.country}</span>
          )}
          {service.duration_minutes && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {service.duration_minutes}min</span>
          )}
          {service.max_capacity > 1 && (
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Max {service.max_capacity}</span>
          )}
        </div>

        {provider && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{provider.display_name}</span>
            {provider.verified && <Badge variant="secondary" className="text-[10px]">✓ Verified</Badge>}
            {Number(provider.rating) > 0 && (
              <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-[hsl(45,90%,50%)]" />{Number(provider.rating).toFixed(1)}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="font-bold text-accent">{priceLabel}</span>
          <div className="flex gap-1.5">
            {/* Share button */}
            {slug && links && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <div className="space-y-1">
                    <button onClick={copyLink} className="flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors">
                      <Copy className="h-3.5 w-3.5" /> Copy link
                    </button>
                    <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors">
                      📱 WhatsApp
                    </a>
                    <a href={links.telegram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors">
                      ✈️ Telegram
                    </a>
                    <a href={links.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors">
                      📘 Facebook
                    </a>
                    <a href={links.email} className="flex items-center gap-2 w-full text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors">
                      ✉️ Email
                    </a>
                    <a href={links.sms} className="flex items-center gap-2 w-full text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors">
                      💬 SMS
                    </a>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Calendar toggle */}
            {showCalendar && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setCalendarOpen(!calendarOpen)}>
                <Calendar className="h-3.5 w-3.5" />
              </Button>
            )}

            {showActions && onEdit && <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>}
            {onBook && <Button size="sm" onClick={onBook}>Book</Button>}
          </div>
        </div>

        {/* Inline calendar */}
        {calendarOpen && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Availability Calendar</p>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setCalendarOpen(false)}>
                <ChevronUp className="h-3 w-3 mr-1" /> Close
              </Button>
            </div>
            <ServiceBookingCalendar
              serviceId={service.id}
              timeSlots={timeSlots}
              blockedDates={blockedDates}
              maxCapacity={service.max_capacity}
              onSelect={() => {}}
              selectedDate={undefined}
              selectedTime=""
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
