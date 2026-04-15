import { memo, useMemo } from "react";
import type { RadarResultItem } from "@/lib/radar/radar-result-item";
import { strictVerticalToRadarCategory as verticalToRadarCategory } from "@/lib/taxonomy/world-class-taxonomy";
import RadarFoodCard from "./RadarFoodCard";
import RadarHotelCard from "./RadarHotelCard";
import RadarPropertyCard from "./RadarPropertyCard";
import RadarServiceCard from "./RadarServiceCard";
import RadarShopCard from "./RadarShopCard";
import RadarTaxiCard from "./RadarTaxiCard";

interface Props {
  item: RadarResultItem;
  rank?: number;
  selected?: boolean;
  onSelect?: () => void;
  onNavigate?: () => void;
  onMessage?: () => void;
  onSave?: () => void;
}

function RadarCardDispatcher({ item, rank, selected, onSelect, onNavigate, onMessage, onSave }: Props) {
  const commonProps = { item, rank, selected, onSelect, onNavigate, onMessage, onSave };
  const radarCategory = useMemo(
    () => verticalToRadarCategory(item.vertical || item.type),
    [item.vertical, item.type]
  );

  let card: React.ReactNode;
  switch (radarCategory) {
    case "food":
    case "grocery":
    case "nightlife":
      card = <RadarFoodCard {...commonProps} />;
      break;
    case "stay":
      card = <RadarHotelCard {...commonProps} />;
      break;
    case "property":
      card = <RadarPropertyCard {...commonProps} />;
      break;
    case "services":
    case "healthcare":
    case "experiences":
      card = <RadarServiceCard {...commonProps} />;
      break;
    case "mobility":
      card = <RadarTaxiCard {...commonProps} />;
      break;
    case "shops":
    default:
      card = <RadarShopCard {...commonProps} />;
  }

  return (
    <div className="relative">
      {card}
      {item.isOnline !== undefined && (
        <span
          className={`absolute top-2 right-2 w-2 h-2 rounded-full border border-background ${item.isOnline ? "bg-success" : "bg-muted-foreground"}`}
          title={item.isOnline ? "Online" : "Offline"}
        />
      )}
    </div>
  );
}

export default memo(RadarCardDispatcher);
