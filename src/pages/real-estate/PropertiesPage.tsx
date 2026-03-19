import { useState } from "react";
import { useProperties } from "@/hooks/useRealEstate";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Building2, MapPin, BedDouble, Ruler } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function PropertiesPage() {
  const [search, setSearch] = useState("");
  const { data: properties, isLoading, error } = useProperties(search || undefined);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search properties…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      )}

      {error && (
        <div className="text-center py-12 text-destructive">
          <p className="text-sm font-medium">Failed to load properties</p>
          <p className="text-xs text-muted-foreground mt-1">{(error as Error).message}</p>
        </div>
      )}

      {!isLoading && !error && properties?.length === 0 && (
        <div className="text-center py-16">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No properties yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Add your first property to get started.</p>
        </div>
      )}

      <div className="grid gap-3">
        {properties?.map((p: any) => (
          <Link key={p.id} to={`/real-estate/property/${p.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate">{p.label}</h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{p.address}, {p.city}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {p.bedrooms && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <BedDouble className="w-3 h-3" /> {p.bedrooms}
                        </span>
                      )}
                      {p.surface && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Ruler className="w-3 h-3" /> {p.surface} m²
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {p.property_type}
                      </Badge>
                    </div>
                  </div>
                  {p.monthly_rent ? (
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold">{p.monthly_rent}€</span>
                      <span className="text-[10px] text-muted-foreground block">/month</span>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
