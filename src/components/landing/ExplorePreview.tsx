/**
 * ExplorePreview — Showcase section for the landing page featuring live listings.
 */
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import * as exploreRepo from "@/repositories/explore.repository";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import {
  ArrowRight, MapPin, Users, Moon, Sparkles,
  Home, Sun, Briefcase, Eye, Globe,
} from "lucide-react";

const PLACEHOLDER_IMG = "/placeholder.svg";

const TABS = [
  { key: "seasonal", label: "Seasonal Rentals", emoji: "🏖️", icon: Sun },
  { key: "real-estate", label: "Real Estate", emoji: "🏠", icon: Home },
  { key: "services", label: "Services", emoji: "🛍️", icon: Briefcase },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function ExplorePreview() {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>("seasonal");
  const [seasonal, setSeasonal] = useState<any[]>([]);
  const [realEstate, setRealEstate] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [reRes, seaRes, svcRes] = await Promise.allSettled([
        exploreRepo.getPublicRealEstateListings(6),
        exploreRepo.getPublicSeasonalListings(6),
        exploreRepo.getPublicMarketplaceServices(),
      ]);

      const realEstateData = reRes.status === "fulfilled" ? (reRes.value || []) as any[] : [];
      const seasonalData = seaRes.status === "fulfilled" ? (seaRes.value || []) as any[] : [];
      const servicesData = svcRes.status === "fulfilled" ? (svcRes.value || []) as any[] : [];

      let nextSeasonal = seasonalData;
      const propertyIds = [...new Set(seasonalData.map((l: any) => l.property_id).filter(Boolean))];
      if (propertyIds.length > 0) {
        const props = await exploreRepo.getListingProperties(propertyIds);
        const propMap: Record<string, any> = {};
        if (props) for (const p of props as any[]) propMap[p.id] = p;
        nextSeasonal = seasonalData.map((l: any) => {
          const prop = propMap[l.property_id];
          const photos = Array.isArray(prop?.photo_urls) ? prop.photo_urls : [];
          return { ...l, city: prop?.city || "", country: prop?.country || "", cover_url: photos[0] || null };
        });
      }

      if (cancelled) return;
      setRealEstate(realEstateData);
      setServices(servicesData);
      setSeasonal(nextSeasonal);
      setLoaded(true);
    };

    void load().catch((error) => {
      console.error("[ExplorePreview] failed to load preview data", error);
      if (cancelled) return;
      setRealEstate([]);
      setServices([]);
      setSeasonal([]);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const items = tab === "seasonal" ? seasonal : tab === "real-estate" ? realEstate : services;
  const totalCount = seasonal.length + realEstate.length + services.length;

  if (!loaded || totalCount === 0) return null;

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/20" />

      <div className="container max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-12 space-y-4"
        >
          <motion.span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] px-5 py-2 rounded-full border border-accent/25 bg-accent/10 text-accent"
            whileHover={{ scale: 1.05 }}
          >
            <Globe className="h-3.5 w-3.5" />
            {t("landing.explore.badge") || "Live Worldwide"}
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
            {t("landing.explore.title") || "Explore What's"}{" "}
            <span className="text-accent">{t("landing.explore.highlight") || "Live Now"}</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("landing.explore.subtitle") || "Properties, vacation rentals, and services — published live by verified hosts and professionals worldwide."}
          </p>
        </motion.div>

        {/* Tab pills */}
        <div className="flex justify-center gap-2 mb-8 overflow-x-auto scrollbar-none -mx-4 px-4">
          {TABS.map(tb => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                tab === tb.key
                  ? "bg-accent text-accent-foreground shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border"
              }`}
            >
              <tb.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tb.label}</span>
              <span className="sm:hidden">{tb.emoji}</span>
              {(tb.key === "seasonal" ? seasonal : tb.key === "real-estate" ? realEstate : services).length > 0 && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                  {(tb.key === "seasonal" ? seasonal : tb.key === "real-estate" ? realEstate : services).length}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.slice(0, 6).map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                to={
                  tab === "seasonal" ? (item.slug ? `/listing/${item.slug}` : "/explore")
                    : tab === "real-estate" ? (item.slug ? `/properties/${item.slug}` : "/explore")
                    : (item.booking_slug ? `/book/${item.booking_slug}` : "/explore")
                }
                className="group block h-full"
              >
                <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:border-accent/30 transition-all duration-300 h-full flex flex-col">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted shrink-0">
                    <img
                      src={
                        tab === "seasonal" ? (item.cover_url || PLACEHOLDER_IMG)
                          : tab === "real-estate" ? (Array.isArray(item.photo_urls) && item.photo_urls[0] ? item.photo_urls[0] : PLACEHOLDER_IMG)
                          : (Array.isArray(item.photo_urls) && item.photo_urls[0] ? item.photo_urls[0] : PLACEHOLDER_IMG)
                      }
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-background/90 backdrop-blur-sm text-foreground text-[10px] font-bold shadow-sm border border-border/50">
                        {tab === "seasonal" ? `🏖️ ${t("landing.explore.seasonal") || "Seasonal"}` : tab === "real-estate" ? `🏠 ${t("landing.explore.real_estate") || "Real Estate"}` : `🛍️ ${t("landing.explore.service") || "Service"}`}
                      </Badge>
                    </div>
                    {/* Transparent watermark */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <span className="text-white/10 text-lg font-black tracking-widest select-none rotate-[-15deg]">EASY-LOCS</span>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1 min-h-[100px]">
                    <h3 className="font-semibold text-foreground text-sm line-clamp-2 break-words group-hover:text-accent transition-colors leading-snug">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="line-clamp-2 break-words leading-snug">
                        {item.city}{item.country ? `, ${item.country.toUpperCase()}` : ""}
                      </span>
                    </div>
                    <div className="pt-2 mt-auto">
                      <span className="text-xs font-medium text-accent flex items-center gap-1 group-hover:gap-2 transition-all">
                        {tab === "services" ? (t("landing.explore.book_now") || "Book now") : (t("landing.explore.view_details") || "View details")} <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link to="/radar">
            <Button size="lg" className="rounded-2xl gap-2 px-8 shadow-lg">
              <Sparkles className="h-4 w-4" />
              {t("landing.explore.cta") || "Explore All Listings"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
