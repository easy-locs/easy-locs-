import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { realEstatePropertyService, realEstateViewingService } from "@/services/real-estate.service";
import { scoreProperty } from "@/domains/real-estate/quality-gates";
import { getCountryRules } from "@/domains/real-estate/country-rules";
import type { Property } from "@/domains/real-estate/canonical-types";
import {
  ArrowLeft, Heart, Share2, MapPin, Bed, Bath, Maximize,
  Phone, MessageCircle, Calendar, ChevronRight, Shield, Star,
} from "lucide-react";

const navy = "hsl(220 40% 18%)";
const gold = "hsl(38 65% 56%)";

export default function RealEstateDetailPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showContactSheet, setShowContactSheet] = useState(false);

  useEffect(() => {
    if (!slug) return;
    realEstatePropertyService.fetchById(slug)
      .then(setProperty)
      .catch(() => setProperty(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "#f8f9fa" }}>
        <div className="h-72 animate-pulse" style={{ background: "#e0e0e0" }} />
        <div className="p-4 space-y-3">
          <div className="h-6 w-3/4 rounded animate-pulse" style={{ background: "#e0e0e0" }} />
          <div className="h-4 w-1/2 rounded animate-pulse" style={{ background: "#e0e0e0" }} />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8f9fa" }}>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: navy }}>{t("re.not_found", "Property not found")}</p>
          <button onClick={() => navigate("/real-estate")} className="mt-3 text-sm underline" style={{ color: gold }}>
            {t("re.back_to_marketplace", "Back to marketplace")}
          </button>
        </div>
      </div>
    );
  }

  const countryRules = getCountryRules(property.address.country);
  const quality = scoreProperty(property);

  return (
    <div className="min-h-screen pb-24" style={{ background: "#f8f9fa" }}>
      <div className="relative h-72 overflow-hidden" style={{ background: "#222" }}>
        <img
          src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop"
          alt={property.title}
          className="w-full h-full object-cover"
        />

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full" style={{ background: "rgba(0,0,0,0.4)" }}>
            <ArrowLeft size={20} color="#fff" />
          </button>
          <div className="flex gap-2">
            <button className="p-2 rounded-full" style={{ background: "rgba(0,0,0,0.4)" }}>
              <Share2 size={18} color="#fff" />
            </button>
            <button className="p-2 rounded-full" style={{ background: "rgba(0,0,0,0.4)" }}>
              <Heart size={18} color="#fff" />
            </button>
          </div>
        </div>

        <div className="absolute bottom-3 left-3 flex gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: gold, color: navy }}>
            {t(`re.listing.${property.listingType}`, property.listingType)}
          </span>
          {property.verificationStatus === "verified" && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1" style={{ background: "#22c55e", color: "#fff" }}>
              <Shield size={10} /> {t("re.verified", "Verified")}
            </span>
          )}
        </div>

        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full text-[10px]" style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}>
          {activeImageIndex + 1}/{Math.max(property.mediaIds.length, 1)}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-lg font-bold" style={{ color: navy }}>{property.title}</h1>
        </div>

        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-xl font-bold" style={{ color: gold }}>
            {property.price.toLocaleString()}
          </span>
          <span className="text-sm" style={{ color: gold }}>{property.currency}</span>
          {property.listingType === "rent" && (
            <span className="text-xs" style={{ color: "#999" }}>/{t("re.per_month", "month")}</span>
          )}
        </div>

        <div className="flex items-center gap-1 mb-4">
          <MapPin size={14} style={{ color: "#999" }} />
          <span className="text-sm" style={{ color: "#666" }}>
            {[property.address.line1, property.address.district, property.address.city, property.address.country]
              .filter(Boolean).join(", ")}
          </span>
        </div>

        <div className="flex gap-4 p-3 rounded-xl mb-4" style={{ background: "#fff" }}>
          {property.bedrooms !== undefined && (
            <div className="flex items-center gap-2">
              <Bed size={18} style={{ color: navy }} />
              <div>
                <p className="text-sm font-bold" style={{ color: navy }}>{property.bedrooms}</p>
                <p className="text-[10px]" style={{ color: "#999" }}>{t("re.beds", "Beds")}</p>
              </div>
            </div>
          )}
          {property.bathrooms !== undefined && (
            <div className="flex items-center gap-2">
              <Bath size={18} style={{ color: navy }} />
              <div>
                <p className="text-sm font-bold" style={{ color: navy }}>{property.bathrooms}</p>
                <p className="text-[10px]" style={{ color: "#999" }}>{t("re.baths", "Baths")}</p>
              </div>
            </div>
          )}
          {property.area !== undefined && (
            <div className="flex items-center gap-2">
              <Maximize size={18} style={{ color: navy }} />
              <div>
                <p className="text-sm font-bold" style={{ color: navy }}>{property.area}</p>
                <p className="text-[10px]" style={{ color: "#999" }}>{countryRules.areaUnit}</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl p-4 mb-4" style={{ background: "#fff" }}>
          <h2 className="text-sm font-bold mb-2" style={{ color: navy }}>{t("re.details", "Details")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <DetailRow label={t("re.property_type", "Type")} value={t(`re.type.${property.propertyType}`, property.propertyType.replace(/_/g, " "))} />
            <DetailRow label={t("re.category", "Category")} value={t(`re.cat.${property.propertyCategory}`, property.propertyCategory)} />
            {property.furnishingStatus && (
              <DetailRow label={t("re.furnishing", "Furnishing")} value={t(`re.furnishing.${property.furnishingStatus}`, property.furnishingStatus.replace(/_/g, " "))} />
            )}
            <DetailRow label={t("re.area_unit", "Area Unit")} value={countryRules.areaUnit} />
          </div>
        </div>

        {property.description && (
          <div className="rounded-xl p-4 mb-4" style={{ background: "#fff" }}>
            <h2 className="text-sm font-bold mb-2" style={{ color: navy }}>{t("re.description", "Description")}</h2>
            <p className="text-sm leading-relaxed" style={{ color: "#555" }}>{property.description}</p>
          </div>
        )}

        {property.amenities.length > 0 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: "#fff" }}>
            <h2 className="text-sm font-bold mb-2" style={{ color: navy }}>{t("re.amenities", "Amenities")}</h2>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map(a => (
                <span key={a} className="px-2.5 py-1 rounded-full text-xs" style={{ background: "#f0f0f0", color: "#555" }}>
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 z-20" style={{ background: "#fff", borderTop: "1px solid #eee" }}>
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={() => navigate(`/orbit?context=property&id=${property.id}`)}
            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold"
            style={{ background: "#f0f0f0", color: navy }}
          >
            <MessageCircle size={16} /> {t("re.contact", "Contact")}
          </button>
          <button
            onClick={() => setShowContactSheet(true)}
            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold"
            style={{ background: gold, color: navy }}
          >
            <Calendar size={16} /> {t("re.book_viewing", "Book Viewing")}
          </button>
        </div>
      </div>

      {showContactSheet && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowContactSheet(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div className="relative w-full rounded-t-2xl p-6" style={{ background: "#fff" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "#ddd" }} />
            <h3 className="text-base font-bold mb-4" style={{ color: navy }}>{t("re.request_viewing", "Request a Viewing")}</h3>
            <div className="space-y-3">
              <button
                onClick={() => { setShowContactSheet(false); navigate(`/orbit?context=property&id=${property.id}`); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "#f8f9fa" }}
              >
                <MessageCircle size={20} style={{ color: gold }} />
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: navy }}>{t("re.chat_agent", "Chat with agent")}</p>
                  <p className="text-xs" style={{ color: "#999" }}>{t("re.via_orbit", "Via Orbit messaging")}</p>
                </div>
                <ChevronRight size={16} className="ml-auto" style={{ color: "#ccc" }} />
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl" style={{ background: "#f8f9fa" }}>
                <Phone size={20} style={{ color: gold }} />
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: navy }}>{t("re.call_agent", "Call agent")}</p>
                  <p className="text-xs" style={{ color: "#999" }}>{t("re.direct_call", "Direct phone call")}</p>
                </div>
                <ChevronRight size={16} className="ml-auto" style={{ color: "#ccc" }} />
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl" style={{ background: "#f8f9fa" }}>
                <Calendar size={20} style={{ color: gold }} />
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: navy }}>{t("re.schedule_viewing", "Schedule viewing")}</p>
                  <p className="text-xs" style={{ color: "#999" }}>{t("re.select_datetime", "Select date & time")}</p>
                </div>
                <ChevronRight size={16} className="ml-auto" style={{ color: "#ccc" }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: "#999" }}>{label}</p>
      <p className="text-xs font-medium capitalize" style={{ color: "hsl(220 40% 18%)" }}>{value}</p>
    </div>
  );
}
