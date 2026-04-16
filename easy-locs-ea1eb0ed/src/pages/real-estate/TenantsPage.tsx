import { useState } from "react";
import { useTenants } from "@/hooks/useRealEstate";
import { Input } from "@/components/ui/input";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function TenantsPage() {
  useUiEngine("real-estate-tenantspage");
  const [search, setSearch] = useState("");
  const { data: tenants, isLoading, error } = useTenants(search || undefined);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search tenants…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border/50" />
      </div>

      {isLoading && <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>}

      {error && (
        <div className="text-center py-12 text-destructive">
          <p className="text-sm font-medium">Failed to load tenants</p>
        </div>
      )}

      {!isLoading && !error && tenants?.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No tenants yet.</p>
        </div>
      )}

      <div className="grid gap-3">
        {tenants?.map((t) => (
          <AppCard key={t.id} className="hover:shadow-sm transition-all border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm">{t.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                    {t.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{t.email}</span>}
                    {t.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{t.phone}</span>}
                  </div>
                  {t.properties && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{(t.properties as any)?.label}, {(t.properties as any)?.city}</span>
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  {t.rent_amount != null && (
                    <Badge variant="secondary" className="text-[0.625rem]">{t.rent_amount}€/mo</Badge>
                  )}
                  <Link to="/orbit" className="text-primary hover:text-primary/80">
                    <MessageCircle className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </AppCard>
        ))}
      </div>
    </div>
  );
}
