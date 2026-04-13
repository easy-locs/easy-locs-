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

  switch (radarCategory) {
    case "food":
    case "grocery":
    case "nightlife":
      return <RadarFoodCard {...commonProps} />;
    case "stay":
      return <RadarHotelCard {...commonProps} />;
    case "property":
      return <RadarPropertyCard {...commonProps} />;
    case "services":
    case "healthcare":
    case "experiences":
      return <RadarServiceCard {...commonProps} />;
    case "mobility":
      return <RadarTaxiCard {...commonProps} />;
    case "shops":
    default:
      return <RadarShopCard {...commonProps} />;
  }
}

export default memo(RadarCardDispatcher);
