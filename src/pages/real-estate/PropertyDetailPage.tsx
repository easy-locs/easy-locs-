import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePropertyUnits, usePropertyDocuments } from "@/hooks/useRealEstate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, BedDouble, Bath, Ruler, Home, FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>();

  const { data: property, isLoading } = useQuery({
    queryKey: ["re-property-detail", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: units } = usePropertyUnits(propertyId);
  const { data: docs } = usePropertyDocuments(propertyId);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <MobilePageHeader title={property?.label || "Property"} backPath="/real-estate" />

        {isLoading && <div className="space-y-4 mt-4"><Skeleton className="h-40 rounded-xl" /></div>}

        {property && (
          <div className="space-y-4 mt-4">
            {/* Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> {property.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{property.address}, {property.postal_code} {property.city}, {property.country}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {property.bedrooms && (
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <BedDouble className="w-4 h-4 mx-auto text-muted-foreground" />
                      <p className="text-sm font-bold mt-1">{property.bedrooms}</p>
                      <p className="text-[10px] text-muted-foreground">Beds</p>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <Bath className="w-4 h-4 mx-auto text-muted-foreground" />
                      <p className="text-sm font-bold mt-1">{property.bathrooms}</p>
                      <p className="text-[10px] text-muted-foreground">Baths</p>
                    </div>
                  )}
                  {property.surface && (
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <Ruler className="w-4 h-4 mx-auto text-muted-foreground" />
                      <p className="text-sm font-bold mt-1">{property.surface}</p>
                      <p className="text-[10px] text-muted-foreground">m²</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="capitalize text-xs">{property.property_type}</Badge>
                  {property.monthly_rent && <Badge variant="secondary" className="text-xs">{property.monthly_rent}€/mo</Badge>}
                  {property.furnished && <Badge variant="outline" className="text-xs">Furnished</Badge>}
                </div>
              </CardContent>
            </Card>

            {/* Units */}
            {units && units.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Home className="w-4 h-4" /> Units ({units.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {units.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                      <div>
                        <p className="font-medium">Unit {u.unit_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.bedrooms && `${u.bedrooms} bed`}{u.size_sqm && ` • ${u.size_sqm}m²`}
                        </p>
                      </div>
                      <div className="text-right">
                        {u.rent_amount > 0 && <span className="text-sm font-bold">{u.rent_amount} {u.currency}</span>}
                        <Badge variant="outline" className="text-[10px] capitalize ml-1.5">{u.status}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            {docs && docs.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Documents ({docs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {docs.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                      <span className="truncate">{d.title || d.doc_type}</span>
                      {d.file_url && (
                        <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-primary">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
