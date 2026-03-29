import { useState, useEffect } from "react";
import { fetchOrgLocalServicesEnabled, fetchLocalServices } from "@/repositories/rental.repository";
import { useI18n } from "@/lib/i18n";
import { Phone, ExternalLink, MapPin } from "lucide-react";

const CATEGORY_ICONS: Record<string, string> = {
  airport_transfer: "✈️", private_driver: "🚗", car_rental: "🏎️",
  chef_at_home: "👨‍🍳", massage_wellness: "💆", excursions: "🏔️",
  boat_trip: "⛵", restaurants: "🍽️", desert_tour: "🏜️",
  babysitting: "👶", cleaning: "🧹", shopping: "🛍️",
  sports: "⚽", cultural_tour: "🏛️", nightlife: "🎶", other: "📌",
};

interface Props {
  orgId: string;
  propertyId: string;
  propertyCity: string;
  propertyCountry: string;
}

const ListingLocalServices = ({ orgId, propertyId, propertyCity, propertyCountry }: Props) => {
  const { t } = useI18n();
  const [services, setServices] = useState<any[]>([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Check if feature enabled for this org
      const isEnabled = await fetchOrgLocalServicesEnabled(orgId);
      if (!isEnabled) return;
      setEnabled(true);

      const svcData = data as any[];

      if (!data) return;

      // Filter: property-specific OR matching city (with no property_id bound)
      const cityLower = (propertyCity || "").toLowerCase().trim();
      const countryLower = (propertyCountry || "").toLowerCase().trim();

      const filtered = data.filter(s => {
        if (s.property_id === propertyId) return true;
        if (!s.property_id) {
          const sCity = (s.city || "").toLowerCase().trim();
          const sCountry = (s.country || "").toLowerCase().trim();
          if (sCity && cityLower && sCity === cityLower) return true;
          if (!sCity && sCountry && countryLower && sCountry === countryLower) return true;
          if (!sCity && !sCountry) return true; // global service
        }
        return false;
      });

      setServices(filtered);
    };
    load();
  }, [orgId, propertyId, propertyCity, propertyCountry]);

  if (!enabled || services.length === 0) return null;

  const sectionTitle = t("page.listing.activities_title") !== "page.listing.activities_title"
    ? t("page.listing.activities_title")
    : "Activités & Services locaux";

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-foreground text-lg flex items-center gap-2">
        🎯 {sectionTitle}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map(s => (
          <div key={s.id} className="bg-muted/30 border border-border/50 rounded-xl overflow-hidden flex flex-col">
            {s.photo_url && (
              <div className="h-28 bg-muted shrink-0">
                <img src={s.photo_url} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}
            <div className="p-3 flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{CATEGORY_ICONS[s.category] || "📌"}</span>
                <span className="font-medium text-foreground text-sm">{s.title}</span>
              </div>
              {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {s.price_indication && <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">{s.price_indication}</span>}
                {s.availability_note && <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{s.availability_note}</span>}
              </div>
              <div className="flex items-center gap-2 mt-auto pt-1">
                {s.whatsapp_number && (
                  <a
                    href={`https://wa.me/${s.whatsapp_number.replace(/[^0-9+]/g, "")}?text=${encodeURIComponent(`Bonjour, je suis intéressé par "${s.title}"`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-[#25D366] text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[#25D366]/90 transition-colors min-h-[44px]"
                  >
                    <Phone className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
                {s.website_url && (
                  <a
                    href={s.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-2 min-h-[44px]"
                  >
                    <ExternalLink className="h-3 w-3" /> Site
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListingLocalServices;
