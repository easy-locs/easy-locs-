import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { usePublicLocale } from "@/hooks/usePublicLocale";
import ListingPhotoGallery from "@/components/public/ListingPhotoGallery";
import BookingForm from "@/components/public/BookingForm";
import RentalCTAPanel from "@/components/public/RentalCTAPanel";
import ListingContactButtons from "@/components/public/ListingContactButtons";
import ShareButtons from "@/components/public/ShareButtons";
import { RENTAL_TYPES, STAY_TYPES } from "@/lib/listing-types";

import SEOHead from "@/components/SEOHead";
import { MapPin, Users, Moon, Euro, Loader2, CheckCircle, Share2, ArrowLeft } from "lucide-react";
import { buildAppUrl } from "@/lib/app-domain";
import { sharePage } from "@/lib/social-share";
import AppLogo from "@/components/AppLogo";
import ListingMapSection from "@/components/public/ListingMapSection";

const PublicListing = () => {
  const { slug, propertySlug } = useParams<{ slug?: string; propertySlug?: string }>();
  const listingSlug = slug || propertySlug;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, setLocale } = useI18n();
  const { locale, changeLocale, supportedLocales } = usePublicLocale();
  const [listing, setListing] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync locale to i18n context
  useEffect(() => { setLocale(locale); }, [locale, setLocale]);

  useEffect(() => {
    if (searchParams.get("payment") === "success") setPaymentSuccess(true);
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      if (!listingSlug) { setNotFound(true); setLoading(false); return; }
      const { data: l } = await supabase
        .from("public_listings")
        .select("*")
        .eq("slug", listingSlug)
        .eq("active", true)
        .maybeSingle();
      if (!l) { setNotFound(true); setLoading(false); return; }
      setListing(l);

      const { data: propData } = await supabase.rpc("get_listing_property", { p_listing_id: l.id });
      setProperty(propData);
      setLoading(false);
    };
    load();
  }, [listingSlug]);

  // Handle payment redirect from email
  useEffect(() => {
    if (listing && searchParams.get("pay_request")) {
      (async () => {
        const requestId = searchParams.get("pay_request");
        if (!requestId) return;
        setSubmitting(true);
        try {
          const { data, error } = await supabase.functions.invoke("create-booking-payment", {
            body: {
              booking_request_id: requestId,
              listing_id: listing.id,
              guest_email: searchParams.get("email") || "",
              guest_name: searchParams.get("name") || "Guest",
              amount: Number(searchParams.get("amount")) || 0,
              nights: Number(searchParams.get("nights")) || 1,
              property_label: listing.title || property?.label,
              origin: buildAppUrl("/"),
            },
          });
          if (error) throw error;
          if (data?.url) window.location.href = data.url;
        } catch (err: any) {
          alert(`${t("page.listing.error_payment")}: ${err.message || ""}`);
        } finally {
          setSubmitting(false);
        }
      })();
    }
  }, [listing]);

  const photos: string[] = property?.photo_urls || [];
  const amenities: any[] = Array.isArray(listing?.amenities) ? listing.amenities : [];
  const stringAmenities = amenities.filter((a: any) => typeof a === "string") as string[];
  const cleaningFeeObj = amenities.find((a: any) => typeof a === "object" && a?.type === "cleaning_fee");
  const cleaningFee = typeof cleaningFeeObj === "object" && cleaningFeeObj ? (cleaningFeeObj as any).amount || 0 : 0;

  const handleShare = async () => {
    if (!listingSlug) return;
    const result = await sharePage({
      type: "listing",
      slug: listingSlug,
      title: listing?.title || "Easy-Locs",
    });
    if (result === "copied") {
      const { toast } = await import("sonner");
      toast.success("Link copied!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("page.listing.not_found")}</h1>
          <p className="text-muted-foreground">{t("page.listing.not_found_desc")}</p>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("page.listing.payment_confirmed")}</h1>
          <p className="text-muted-foreground">{t("page.listing.payment_confirmed_desc")}</p>
        </div>
      </div>
    );
  }

  const listingTitle = listing.title || property?.label || "Vacation Rental";
  const listingCity = property?.city || listing.city || "";
  const listingCountry = property?.country || listing.country || "";
  const seoTitle = `${listingTitle} — ${listingCity} | Easy-Locs`.slice(0, 60);
  const seoDesc = `${listingTitle} in ${listingCity}${listingCountry ? `, ${listingCountry}` : ""}. ${listing.max_guests ? `Up to ${listing.max_guests} guests.` : ""} Book directly on Easy-Locs.`.slice(0, 160);
  const listingUrl = `https://www.easy-locs.com/listing/${listingSlug}`;
  const listingJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "LodgingBusiness",
      name: listingTitle,
      description: listing.description?.slice(0, 300) || seoDesc,
      url: listingUrl,
      image: listing.cover_url || photos[0],
      address: {
        "@type": "PostalAddress",
        streetAddress: property?.address,
        addressLocality: listingCity,
        postalCode: property?.postal_code,
        addressCountry: listingCountry,
      },
      ...(listing.price_per_night > 0 ? {
        priceRange: `€${listing.price_per_night}/night`,
        offers: { "@type": "Offer", price: listing.price_per_night, priceCurrency: listing.currency || "EUR" },
      } : {}),
      ...(listing.max_guests ? { amenityFeature: { "@type": "LocationFeatureSpecification", name: "Max guests", value: listing.max_guests } } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Explore", item: "https://www.easy-locs.com/explore" },
        ...(listingCountry ? [{ "@type": "ListItem", position: 2, name: listingCountry.toUpperCase(), item: `https://www.easy-locs.com/country/${listingCountry.toLowerCase()}` }] : []),
        ...(listingCity ? [{ "@type": "ListItem", position: 3, name: listingCity, item: `https://www.easy-locs.com/city/${listingCity.toLowerCase().replace(/\s+/g, "-")}` }] : []),
        { "@type": "ListItem", position: listingCity ? 4 : listingCountry ? 3 : 2, name: listingTitle, item: listingUrl },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={seoTitle}
        description={seoDesc}
        canonical={listingUrl}
        ogImage={listing.cover_url || photos[0] || "https://www.easy-locs.com/pwa-512x512.png"}
        jsonLd={listingJsonLd}
      />
      {/* Top bar with logo + language */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/explore")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[36px] min-w-[36px] rounded-lg hover:bg-muted/50 px-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t("explore.back") || "Back"}</span>
            </button>
            <AppLogo variant="header" linkTo="/" />
          </div>
          <div className="flex items-center gap-2">
            <ShareButtons type="listing" slug={listingSlug || ""} title={listing?.title || "Easy-Locs"} />
          </div>
        </div>
      </header>

      {/* Hero gallery */}
      <ListingPhotoGallery photos={photos} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {listing.title || property?.label}
              </h1>
              <p className="text-muted-foreground flex items-center gap-1.5 mt-2">
                <MapPin className="h-4 w-4 shrink-0" />
                {property?.address}, {property?.postal_code} {property?.city}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              {listing.price_per_night > 0 && (
                <span className="flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-2 rounded-xl font-medium">
                  <Euro className="h-4 w-4" />
                  <span className="whitespace-nowrap">{listing.price_per_night} € {t("page.listing.per_night")}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-2 rounded-xl">
                <Users className="h-4 w-4" /> {listing.max_guests} {t("page.listing.guests_max")}
              </span>
              <span className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-2 rounded-xl">
                <Moon className="h-4 w-4" /> {t("page.listing.min_nights").replace("{n}", String(listing.min_nights))}
              </span>
            </div>

            {listing.description && (
              <div>
                <h2 className="font-semibold text-foreground mb-2">{t("page.listing.description")}</h2>
                <p className="text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed">{listing.description}</p>
              </div>
            )}

            {property?.surface && (
              <div className="text-sm text-muted-foreground">
                {t("page.listing.surface")} : {property.surface} m² · {property.rooms || 1} {t("page.listing.rooms")}
                {property.furnished && ` · ${t("page.listing.furnished")}`}
              </div>
            )}

            {stringAmenities.length > 0 && (
              <div>
                <h2 className="font-semibold text-foreground mb-2">{t("page.listing.amenities")}</h2>
                <div className="flex flex-wrap gap-2">
                  {stringAmenities.map(a => (
                    <span key={a} className="bg-muted text-muted-foreground px-3 py-1.5 rounded-xl text-xs font-medium">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Thumbnails */}
            {photos.length > 1 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((url, i) => (
                  <div key={i} className="rounded-xl overflow-hidden aspect-[4/3]">
                    <img src={url} alt={`Property photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            )}

            {/* Map & Directions */}
            <ListingMapSection
              lat={listing.lat || property?.lat}
              lng={listing.lng || property?.lng}
              address={property?.address}
              city={property?.city || listing.city}
              country={property?.country || listing.country}
            />

          </div>

          {/* Booking form */}
          <div className="lg:col-span-1">
            <div className="sticky top-16 bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
              <BookingForm listing={listing} property={property} cleaningFee={cleaningFee} />
              <ListingContactButtons
                contactEmail={property?.contact_email}
                hasPhone={property?.has_phone ?? !!property?.contact_phone}
                hasWhatsapp={property?.has_whatsapp ?? false}
                telegramUsername={property?.telegram_username}
                listingTitle={listingTitle}
                listingUrl={listingUrl}
                listingPrice={`${listing.price_per_night} € / ${t("page.listing.per_night")}`}
                listingCity={listingCity}
                listingCountry={listingCountry}
                listingId={listing?.id}
                orgId={listing?.org_id}
                source="seasonal"
              />
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border">
        {t("page.tsignup.powered_by")} <span className="font-semibold">EASY-LOCS®</span>
      </footer>
    </div>
  );
};

export default PublicListing;
