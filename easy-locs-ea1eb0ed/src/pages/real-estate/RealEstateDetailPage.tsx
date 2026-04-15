import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { realEstatePropertyService, realEstateViewingService, realEstateDocumentService } from "@/services/real-estate.service";
import { scoreProperty } from "@/domains/real-estate/quality-gates";
import { getCountryRules } from "@/domains/real-estate/country-rules";
import type { Property } from "@/domains/real-estate/canonical-types";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import {
  ArrowLeft, Heart, Share2, MapPin, Bed, Bath, Maximize,
  Phone, MessageCircle, Calendar, ChevronRight, Shield, Star,
} from "lucide-react";
import { InvestmentEstimator } from "@/components/property/InvestmentEstimator";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { bannerCover } from "@/lib/image/category-covers";

const navy = "hsl(226 24% 14%)";
const gold = "hsl(var(--accent))";

export default function RealEstateDetailPage() {
  useUiEngine("real-estate-realestatedetailpage");
  const { t } = useI18n();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showContactSheet, setShowContactSheet] = useState(false);

  useEffect(() => {
    if (!slug) return;
    realEstatePropertyService.fetchById(slug)
      .then(p => {
        setProperty(p);
        if (p) {
          realEstateDocumentService.fetchByEntity("property", p.id)
            .then(docs => setDocumentCount(docs.length))
            .catch(() => setDocumentCount(0));
        }
      })
      .catch(() => setProperty(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <SubPageShell noContentPad>
        <div className="h-72 animate-pulse" style={{ background: "#e0e0e0" }} />
        <div className="p-4 space-y-3">
          <div className="h-6 w-3/4 rounded animate-pulse" style={{ background: "#e0e0e0" }} />
          <div className="h-4 w-1/2 rounded animate-pulse" style={{ background: "#e0e0e0" }} />
        </div>
    </SubPageShell>
    );
  }

  if (!property) {
    return (
      <SubPageShell noContentPad className="flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: navy }}>{t("re.not_found", "Property not found")}</p>
          <button onClick={() => navigate("/real-estate")} className="mt-3 text-sm underline" style={{ color: gold }}>
            {t("re.back_to_marketplace", "Back to marketplace")}
          </button>
        </div>
      </SubPageShell>
    );
  }

  const countryRules = getCountryRules(property.address.country);
  const quality = scoreProperty(property, documentCount);

  const galleryImages = useMemo(() => {
    const urlLike = property.mediaIds.filter(id => id.startsWith("http") || id.startsWith("/"));
    if (urlLike.length > 0) return urlLike;
    const cover = bannerCover(`buy_${property.propertyType}`);
    const typeVariants = [
      bannerCover(`rent_${property.propertyType}`),
      bannerCover(`buy_apartment`),
      bannerCover(`buy_villa`),
    ].filter(url => url !== cover);
    return [cover, ...typeVariants.slice(0, 3)];
  }, [property.propertyType, property.mediaIds]);

  return (
    <SubPageShell noContentPad>
      <div className="relative">
        <PropertyGallery images={galleryImages} variant="hero" />

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-black/40">
            <ArrowLeft size={20} color="#fff" />
          </button>
          <div className="flex gap-2">
            <button className="p-2 rounded-full bg-black/40">
              <Share2 size={18} color="#fff" />
            </button>
            <button className="p-2 rounded-full bg-black/40">
              <Heart size={18} color="#fff" />
            </button>
          </div>
        </div>

        <div className="absolute bottom-14 left-3 flex gap-2 z-10">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: gold, color: navy }}>
            {t(`re.listing.${property.listingType}`, property.listingType)}
          </span>
          {property.verificationStatus === "verified" && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 bg-green-500 text-white">
              <Shield size={10} /> {t("re.verified", "Verified")}
            </span>
          )}
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

        <div className="flex gap-4 p-3 rounded-xl mb-5 bg-card">
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

        <div className="rounded-xl p-4 mb-5 bg-card">
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
          <div className="rounded-xl p-4 mb-5 bg-card">
            <h2 className="text-sm font-bold mb-2" style={{ color: navy }}>{t("re.description", "Description")}</h2>
            <p className="text-sm leading-relaxed" style={{ color: "#555" }}>{property.description}</p>
          </div>
        )}

        {property.amenities.length > 0 && (
          <div className="rounded-xl p-4 mb-5 bg-card">
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

        <div className="mb-5">
          <InvestmentEstimator property={property} />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 z-20 bg-card border-t border-border">
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
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full rounded-t-2xl p-6 bg-card" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "#ddd" }} />
            <h3 className="text-base font-bold mb-5" style={{ color: navy }}>{t("re.request_viewing", "Request a Viewing")}</h3>
            <div className="space-y-3">
              <button
                onClick={() => { setShowContactSheet(false); navigate(`/orbit?context=property&id=${property.id}`); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted"
              >
                <MessageCircle size={20} style={{ color: gold }} />
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: navy }}>{t("re.chat_agent", "Chat with agent")}</p>
                  <p className="text-xs" style={{ color: "#999" }}>{t("re.via_orbit", "Via Orbit messaging")}</p>
                </div>
                <ChevronRight size={16} className="ml-auto" style={{ color: "#ccc" }} />
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted">
                <Phone size={20} style={{ color: gold }} />
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: navy }}>{t("re.call_agent", "Call agent")}</p>
                  <p className="text-xs" style={{ color: "#999" }}>{t("re.direct_call", "Direct phone call")}</p>
                </div>
                <ChevronRight size={16} className="ml-auto" style={{ color: "#ccc" }} />
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted">
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
    </SubPageShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: "#999" }}>{label}</p>
      <p className="text-xs font-medium capitalize" style={{ color: "hsl(226 24% 14%)" }}>{value}</p>
    </div>
  );
}
