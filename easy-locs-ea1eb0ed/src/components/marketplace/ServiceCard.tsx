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

const GOLD = "hsl(38 65% 56%)";
const NAVY = "hsl(220 40% 18%)";
const CARD_SHADOW = "0 1px 4px hsl(var(--foreground) / 0.04), 0 4px 12px hsl(var(--foreground) / 0.03)";

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

  const rating = Number(provider?.rating || service.rating || 0);
  const reviewsCount = Number(provider?.reviews_count || service.reviews_count || 0);
  const completedJobs = Number(provider?.completed_jobs || service.completed_jobs || 0);
  const verified = provider?.verified || service.verified;
  const responseRate = Number(provider?.response_rate || 0);

  return (
    <div
      className="overflow-hidden rounded-2xl transition-all duration-300 group h-full flex flex-col"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border) / 0.12)",
        boxShadow: CARD_SHADOW,
      }}
    >
      {photos.length > 0 ? (
        <div className="relative aspect-[16/10] shrink-0 overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
          <img
            src={photos[photoIdx]}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] backdrop-blur-sm bg-background/80 border-0 shadow-sm">
              {cat.icon} {cat.label}
            </Badge>
            {verified && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-lg backdrop-blur-sm shadow-sm"
                style={{ background: GOLD, color: NAVY }}>
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
                    aria-label={`${t("mp.photo") || "Photo"} ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
          {service.requires_id_document && (
            <Badge variant="outline" className="absolute top-2.5 right-2.5 text-[10px] bg-background/80 backdrop-blur-sm border-0 shadow-sm">🪪 ID</Badge>
          )}
          {service.video_url && (
            <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-background/80 backdrop-blur-sm text-[10px] font-semibold px-2 py-1 rounded-lg shadow-sm">
              <Play className="w-3 h-3" /> {t("mp.video") || "Video"}
            </span>
          )}
        </div>
      ) : (
        <div className="h-36 sm:h-48 shrink-0 flex flex-col items-center justify-center gap-2 relative" style={{ background: "linear-gradient(135deg, hsl(38 65% 56% / 0.05), hsl(var(--muted) / 0.5))" }}>
          <span className="text-4xl">{cat.icon}</span>
          <Badge variant="secondary" className="text-[10px]">{cat.label}</Badge>
          {verified && (
            <span className="absolute top-2.5 left-2.5 flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-lg"
              style={{ background: GOLD, color: NAVY }}>
              <CheckCircle2 className="h-3 w-3" /> {t("mp.verified") || "Verified"}
            </span>
          )}
        </div>
      )}

      <div className="p-3.5 space-y-2.5 flex-1 flex flex-col">
        {(service.badges || []).length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {(service.badges || []).map((b: string) => (
              <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>
            ))}
          </div>
        )}

        <h3 className="font-bold line-clamp-2 leading-snug text-sm break-words min-w-0" style={{ color: "hsl(var(--foreground))" }}>{service.title}</h3>
        {service.description && <p className="text-xs line-clamp-3 leading-relaxed break-words min-w-0" style={{ color: "hsl(var(--muted-foreground))" }}>{service.description}</p>}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          {service.city && (
            <span className="flex items-center gap-1 min-w-0"><MapPin className="h-3 w-3 shrink-0" style={{ color: GOLD }} /><span className="truncate max-w-[140px]">{service.city}, {service.country}</span></span>
          )}
          {service.duration_minutes && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }} /> {service.duration_minutes}min</span>
          )}
          {service.max_capacity > 1 && (
            <span className="flex items-center gap-1"><Users className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }} /> Max {service.max_capacity}</span>
          )}
        </div>

        {(rating > 0 || completedJobs > 0 || responseRate > 0) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs py-1.5 px-2.5 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.12)", color: "hsl(var(--muted-foreground))" }}>
            {rating > 0 && (
              <span className="flex items-center gap-1 font-medium" style={{ color: "hsl(var(--foreground))" }}>
                <Star className="h-3.5 w-3.5 fill-current" style={{ color: GOLD }} />
                {rating.toFixed(1)}
                {reviewsCount > 0 && <span style={{ color: "hsl(var(--muted-foreground))" }} className="font-normal">({reviewsCount})</span>}
              </span>
            )}
            {completedJobs > 0 && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }} /> {completedJobs} {t("mp.jobs") || "jobs"}
              </span>
            )}
            {responseRate > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }} /> {responseRate}%
              </span>
            )}
          </div>
        )}

        {provider && (
          <div className="flex items-start gap-2.5 text-xs p-2.5 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.12)", color: "hsl(var(--muted-foreground))" }}>
            {provider.avatar_url ? (
              <img src={provider.avatar_url} alt={provider.name || t("mp.provider") || "Provider"} className="w-7 h-7 rounded-full object-cover shrink-0" style={{ border: "1px solid hsl(var(--border) / 0.2)" }} />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "hsl(38 65% 56% / 0.1)", color: GOLD, border: "1px solid hsl(38 65% 56% / 0.2)" }}>
                {provider.display_name?.charAt(0) || "P"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="font-medium text-xs break-words leading-snug" style={{ color: "hsl(var(--foreground))" }}>{provider.display_name}</span>
              {provider.verified && (
                <CheckCircle2 className="inline h-3 w-3 ml-1" style={{ color: GOLD }} />
              )}
              {Number(provider.rating) > 0 && (
                <span className="flex items-center gap-0.5 text-xs">
                  <Star className="h-3 w-3 fill-current" style={{ color: GOLD }} />
                  {Number(provider.rating).toFixed(1)}
                </span>
              )}
            </div>
          </div>
        )}

        {showActions && service.source_contact_name && (
          <div className="flex items-center gap-2 text-xs p-2.5 rounded-xl" style={{ background: "hsl(38 65% 56% / 0.05)", border: "1px solid hsl(38 65% 56% / 0.1)", color: "hsl(var(--muted-foreground))" }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ background: "hsl(38 65% 56% / 0.2)", color: GOLD }}>
              {service.source_contact_name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-medium text-xs" style={{ color: "hsl(var(--foreground))" }}>📌 {service.source_contact_name}</span>
              <div className="flex items-center gap-2 flex-wrap">
                {service.source_contact_phone && <span className="text-[10px]">📞 {service.source_contact_phone}</span>}
                {service.source_contact_email && <span className="text-[10px] min-w-0 break-words leading-snug">✉️ {service.source_contact_email}</span>}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-auto" style={{ borderTop: "1px solid hsl(var(--border) / 0.12)" }}>
          <div className="flex flex-col">
            <span className="font-bold text-base break-words" style={{ color: GOLD }}>{priceLabel}</span>
            {photos.length > 1 && (
              <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{photos.length} {t("mp.photos") || "photos"}</span>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {slug && links && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" style={{ color: "hsl(var(--muted-foreground))" }}>
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <div className="space-y-1">
                    <button onClick={copyLink} className="flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors" style={{ color: "hsl(var(--foreground))" }}>
                      <Copy className="h-3.5 w-3.5" /> {t("mp.copy_link") || "Copy link"}
                    </button>
                    <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full text-sm px-2 py-1.5 rounded-lg transition-colors">
                      📱 WhatsApp
                    </a>
                    <a href={links.telegram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full text-sm px-2 py-1.5 rounded-lg transition-colors">
                      ✈️ Telegram
                    </a>
                    <a href={links.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full text-sm px-2 py-1.5 rounded-lg transition-colors">
                      📘 Facebook
                    </a>
                    <a href={links.email} className="flex items-center gap-2 w-full text-sm px-2 py-1.5 rounded-lg transition-colors">
                      ✉️ Email
                    </a>
                    <a href={links.sms} className="flex items-center gap-2 w-full text-sm px-2 py-1.5 rounded-lg transition-colors">
                      💬 SMS
                    </a>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {showCalendar && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" style={{ color: "hsl(var(--muted-foreground))" }} onClick={() => setCalendarOpen(!calendarOpen)}>
                <Calendar className="h-3.5 w-3.5" />
              </Button>
            )}

            {showActions && onEdit && <Button size="sm" variant="outline" onClick={onEdit}>{t("mp.edit") || "Edit"}</Button>}
          </div>
        </div>

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
          <div className="pt-3" style={{ borderTop: "1px solid hsl(var(--border) / 0.12)" }}>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>{t("mp.availability_calendar") || "Availability Calendar"}</p>
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
      </div>
    </div>
  );
}
