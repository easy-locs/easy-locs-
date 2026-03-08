import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategoryInfo } from "./MarketplaceCategories";
import { MapPin, Clock, Users, Star } from "lucide-react";

interface Props {
  service: any;
  provider?: any;
  onBook?: () => void;
  onEdit?: () => void;
  showActions?: boolean;
}

export default function ServiceCard({ service, provider, onBook, onEdit, showActions }: Props) {
  const cat = getCategoryInfo(service.category);
  const photos = (service.photo_urls || []) as string[];
  const priceLabel = service.price_type === "quote"
    ? "On quote"
    : `${Number(service.price).toLocaleString()} ${service.currency}${service.price_type === "hourly" ? "/h" : service.price_type === "daily" ? "/day" : ""}`;

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
          <div className="flex gap-2">
            {showActions && onEdit && <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>}
            {onBook && <Button size="sm" onClick={onBook}>Book</Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
