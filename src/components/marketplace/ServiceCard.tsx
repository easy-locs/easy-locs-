import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategoryInfo } from "@/lib/taxonomy/category-tree";
import { MapPin, Clock, Users, Star, Share2, Copy, Calendar, ChevronUp, ChevronLeft, ChevronRight, CheckCircle2, MessageSquare, Briefcase, Play } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getShareLinks, sharePage } from "@/lib/social-share";
import { toast } from "sonner";
import ServiceBookingCalendar from "@/components/concierge/ServiceBookingCalendar";
import MarketplaceDisclaimer from "./MarketplaceDisclaimer";
import { useI18n } from "@/lib/i18n";
import UniversalActionButtons from "@/components/actions/UniversalActionButtons";

interface Props {
  service: any;
  provider?: any;
  onBook?: () => void;
  onEdit?: () => void;
  showActions?: boolean;
  showCalendar?: boolean;
}

export default function ServiceCard({ service, provider, onBook, onEdit, showActions, showCalendar }: Props) {
  const { t } = useI18n();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const cat = getCategoryInfo(service.category);
  const photos = (service.photo_urls || []) as string[];
  const priceLabel = service.price_type === "quote"
    ? t("mp.on_quote") || "On quote"
    : `${Number(service.price).toLocaleString()} ${service.currency}${service.price_type === "hourly" ? "/h" : service.price_type === "daily" ? `/${t("mp.day") || "day"}` : ""}`;

  const slug = service.booking_slug;
  const links = slug ? getShareLinks("service", slug, service.title, service.updated_at) : null;

  const handleShare = async () => {
    if (!slug) { toast.error(t("mp.no_booking_slug") || "No booking slug configured"); return; }
    const result = await sharePage({ type: "service", slug, title: service.title, version: service.updated_at });
    if (result === "copied") toast.success(t("mp.link_copied") || "Link copied!");
    else if (result === "shared") toast.success(t("mp.shared") || "Shared!");
  };

  const copyLink = () => {
    if (!links) return;
    navigator.clipboard.writeText(links.copy);
    toast.success(t("mp.link_copied") || "Booking link copied!");
  };

  const timeSlots = Array.isArray(service.time_slots) ? service.time_slots : [];
  const blockedDates = Array.isArray(service.blocked_dates) ? service.blocked_dates : [];

  const nextPhoto = (e: React.MouseEvent) => { e.stopPropagation(); setPhotoIdx((i) => (i + 1) % photos.length); };
  const prevPhoto = (e: React.MouseEvent) => { e.stopPropagation(); setPhotoIdx((i) => (i - 1 + photos.length) % photos.length); };

  // Trust metrics
  const rating = Number(provider?.rating || service.rating || 0);
  const reviewsCount = Number(provider?.reviews_count || service.reviews_count || 0);
  const completedJobs = Number(provider?.completed_jobs || service.completed_jobs || 0);
  const verified = provider?.verified || service.verified;
  const responseRate = Number(provider?.response_rate || 0);

  return (
    <Card className="overflow-hidden border-border/60 hover:border-accent/40 hover:shadow-card-hover transition-all duration-300 group h-full flex flex-col">
      {/* Photo gallery */}
      {photos.length > 0 ? (
        <div className="relative aspect-[16/10] shrink-0 bg-muted overflow-hidden">
          <img
            src={photos[photoIdx]}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          {/* Category + verified */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] backdrop-blur-sm bg-background/80 border-0 shadow-sm">
              {cat.icon} {cat.label}
            </Badge>
            {verified && (
            <span className="flex items-center gap-0.5 bg-accent/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm shadow-sm">
                <CheckCircle2 className="h-3 w-3" /> {t("mp.verified") || "Verified"}
              </span>
            )}
          </div>
          {photos.length > 1 && (
            <>
              <button onClick={prevPhoto} className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center sm:opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={nextPhoto} className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center sm:opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setPhotoIdx(i); }}
                    className={`w-2 h-2 rounded-full transition-all ${i === photoIdx ? "bg-white scale-110" : "bg-white/50"}`}
                    aria-label={`Photo ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
          {service.requires_id_document && (
            <Badge variant="outline" className="absolute top-2.5 right-2.5 text-[10px] bg-background/80 backdrop-blur-sm border-0 shadow-sm">🪪 ID</Badge>
          )}
          {service.video_url && (
            <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-background/80 backdrop-blur-sm text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm">
              <Play className="w-3 h-3" /> Video
            </span>
          )}
        </div>
      ) : (
        <div className="h-36 sm:h-48 shrink-0 bg-gradient-to-br from-accent/5 to-muted/50 flex flex-col items-center justify-center gap-2 relative">
          <span className="text-4xl">{cat.icon}</span>
          <Badge variant="secondary" className="text-[10px]">{cat.label}</Badge>
          {verified && (
            <span className="absolute top-2.5 left-2.5 flex items-center gap-0.5 bg-accent/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" /> {t("mp.verified") || "Verified"}
            </span>
          )}
        </div>
      )}
      <CardContent className="pt-3.5 pb-4 space-y-2.5 flex-1 flex flex-col">
        {/* Badges row */}
        {(service.badges || []).length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {(service.badges || []).map((b: string) => (
              <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>
            ))}
          </div>
        )}

        <h3 className="font-semibold text-foreground line-clamp-2 leading-snug text-[15px] break-words">{service.title}</h3>
        {service.description && <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed break-words">{service.description}</p>}

        {/* Location + duration + capacity */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {service.city && (
            <span className="flex items-center gap-1 break-words"><MapPin className="h-3 w-3 text-accent/70 shrink-0" /> {service.city}, {service.country}</span>
          )}
          {service.duration_minutes && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-accent/70" /> {service.duration_minutes}min</span>
          )}
          {service.max_capacity > 1 && (
            <span className="flex items-center gap-1"><Users className="h-3 w-3 text-accent/70" /> Max {service.max_capacity}</span>
          )}
        </div>

        {/* Trust metrics strip */}
        {(rating > 0 || completedJobs > 0 || responseRate > 0) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground py-1.5 px-2.5 bg-muted/30 rounded-lg border border-border/30">
            {rating > 0 && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Star className="h-3.5 w-3.5 text-[hsl(var(--chart-4))] fill-[hsl(var(--chart-4))]" />
                {rating.toFixed(1)}
                {reviewsCount > 0 && <span className="text-muted-foreground font-normal">({reviewsCount})</span>}
              </span>
            )}
            {completedJobs > 0 && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3 text-accent/70" /> {completedJobs} {t("mp.jobs") || "jobs"}
              </span>
            )}
            {responseRate > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3 text-accent/70" /> {responseRate}%
              </span>
            )}
          </div>
        )}

        {/* Provider mini-card */}
        {provider && (
          <div className="flex items-start gap-2.5 text-xs text-muted-foreground p-2.5 bg-muted/30 rounded-lg border border-border/40">
            {provider.avatar_url ? (
              <img src={provider.avatar_url} alt={provider.name || "Provider"} className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-border" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-accent text-[11px] font-bold shrink-0 ring-1 ring-accent/20">
                {provider.display_name?.charAt(0) || "P"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="font-medium text-foreground text-[12px] break-words leading-snug">{provider.display_name}</span>
              {provider.verified && (
                <CheckCircle2 className="inline h-3 w-3 text-accent ml-1" />
              )}
              {Number(provider.rating) > 0 && (
                <span className="flex items-center gap-0.5 text-[11px]">
                  <Star className="h-3 w-3 text-[hsl(var(--chart-4))] fill-[hsl(var(--chart-4))]" />
                  {Number(provider.rating).toFixed(1)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Source / Provider Contact — dashboard only */}
        {showActions && service.source_contact_name && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2.5 bg-accent/5 rounded-lg border border-accent/10">
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold shrink-0">
              {service.source_contact_name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-medium text-foreground text-[11px]">📌 {service.source_contact_name}</span>
              <div className="flex items-center gap-2 flex-wrap">
                {service.source_contact_phone && <span className="text-[10px]">📞 {service.source_contact_phone}</span>}
                {service.source_contact_email && <span className="text-[10px] min-w-0 break-words leading-snug">✉️ {service.source_contact_email}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Price + Actions footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-border/50 mt-auto">
          <div className="flex flex-col">
            <span className="font-bold text-accent text-base break-words">{priceLabel}</span>
            {photos.length > 1 && (
              <span className="text-[10px] text-muted-foreground">{photos.length} {t("mp.photos") || "photos"}</span>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {slug && links && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-accent">
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <div className="space-y-1">
                    <button onClick={copyLink} className="flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors">
                      <Copy className="h-3.5 w-3.5" /> {t("mp.copy_link") || "Copy link"}
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

            {showCalendar && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-accent" onClick={() => setCalendarOpen(!calendarOpen)}>
                <Calendar className="h-3.5 w-3.5" />
              </Button>
            )}

            {showActions && onEdit && <Button size="sm" variant="outline" onClick={onEdit}>{t("mp.edit") || "Edit"}</Button>}
          </div>
        </div>

        {/* Universal Action Buttons for service */}
        <div className="pt-2">
          <UniversalActionButtons
            entityType="service"
            entityId={service.id}
            slug={service.booking_slug}
            title={service.title}
            amount={service.price_type !== "quote" ? service.price : undefined}
            currency={service.currency}
            compact
            metadata={{ source: "marketplace", category: service.category }}
            overridePrimary={onBook ? { action: "open", label: t("mp.book") || "Book", icon: "open" } : undefined}
            onActionComplete={(action) => {
              if (action === "open" && onBook) onBook();
            }}
          />
        </div>

        {calendarOpen && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">{t("mp.availability_calendar") || "Availability Calendar"}</p>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setCalendarOpen(false)}>
                <ChevronUp className="h-3 w-3 mr-1" /> {t("mp.close") || "Close"}
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
