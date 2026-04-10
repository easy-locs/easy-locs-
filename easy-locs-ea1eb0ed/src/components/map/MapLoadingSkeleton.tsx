interface Props {
  cardCount?: number;
  showMap?: boolean;
}

export default function MapLoadingSkeleton({ cardCount = 3, showMap = true }: Props) {
  return <div className="min-h-[400px]" />;
}
