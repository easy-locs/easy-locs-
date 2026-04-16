import { useState } from "react";
import { useProperties, useRealEstateStats } from "@/hooks/useRealEstate";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Search, Building2, MapPin, BedDouble, Ruler, Users, KeyRound, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function PropertiesPage() {
  useUiEngine("real-estate-propertiespage");
  const [search, setSearch] = useState("");
  const { data: properties, isLoading, error } = useProperties(search || undefined);
  const { data: stats } = useRealEstateStats();

  return (
    <div className="space-y-4">
      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Properties", value: stats.propertiesCount, icon: Building2, color: "text-primary" },
            { label: "Tenants", value: stats.tenantsCount, icon: Users, color: "text-blue-500" },
            { label: "Leases", value: stats.leasesCount, icon: KeyRound, color: "text-emerald-500" },
            { label: "Overdue", value: stats.overduePayments, icon: AlertTriangle, color: stats.overduePayments > 0 ? "text-destructive" : "text-muted-foreground" },
          ].map((s) => (
            <AppCard key={s.label} className="border-border/50">
              <CardContent className="p-3 text-center">
                <s.icon className={`w-4 h-4 mx-auto ${s.color}`} />
                <p className="text-lg font-bold mt-1">{s.value}</p>
                <p className="text-[0.625rem] text-muted-foreground">{s.label}</p>
              </CardContent>
            </AppCard>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search properties…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border/50"
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
        {properties?.map((p) => (
          <Link key={p.id} to={`/real-estate/property/${p.id}`}>
            <AppCard className="hover:shadow-md transition-all hover:border-primary/20 cursor-pointer border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm line-clamp-2 break-words">{p.label}</h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{p.address}, {p.city}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {p.bedrooms != null && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <BedDouble className="w-3 h-3" /> {p.bedrooms}
                        </span>
                      )}
                      {p.surface != null && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Ruler className="w-3 h-3" /> {p.surface} m²
                        </span>
                      )}
                      <Badge variant="outline" className="text-[0.625rem] capitalize">
                        {p.property_type}
                      </Badge>
                    </div>
                  </div>
                  {p.monthly_rent ? (
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-primary">{p.monthly_rent}€</span>
                      <span className="text-[0.625rem] text-muted-foreground block">/month</span>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </AppCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
