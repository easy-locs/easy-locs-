import { memo } from "react";
import type { RadarResultItem } from "@/lib/radar/radar-result-item";
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

  switch (item.type) {
    case "food":
    case "grocery":
    case "nightlife":
      return <RadarFoodCard {...commonProps} />;
    case "hotel":
      return <RadarHotelCard {...commonProps} />;
    case "property":
      return <RadarPropertyCard {...commonProps} />;
    case "services":
    case "healthcare":
      return <RadarServiceCard {...commonProps} />;
    case "taxi":
      return <RadarTaxiCard {...commonProps} />;
    case "shops":
    default:
      return <RadarShopCard {...commonProps} />;
  }
}

export default memo(RadarCardDispatcher);
