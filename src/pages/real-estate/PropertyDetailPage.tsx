import { useParams, Link } from "react-router-dom";
import { usePropertyById, usePropertyUnits, usePropertyDocuments } from "@/hooks/useRealEstate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, BedDouble, Bath, Ruler, Home, FileText, ExternalLink, MessageCircle, Wallet } from "lucide-react";

export default function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { data: property, isLoading } = usePropertyById(propertyId);
  const { data: units } = usePropertyUnits(propertyId);
  const { data: docs } = usePropertyDocuments(propertyId);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <MobilePageHeader title={property?.label || "Property"} backTo="/property-management" />

        {isLoading && <div className="space-y-4 mt-4"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-24 rounded-xl" /></div>}

        {property && (
          <div className="space-y-4 mt-4">
            {/* Overview card */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> {property.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{property.address}, {property.postal_code} {property.city}, {property.country}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {property.bedrooms != null && (
                    <div className="text-center p-2.5 bg-muted/30 rounded-xl border border-border/30">
                      <BedDouble className="w-4 h-4 mx-auto text-primary/70" />
                      <p className="text-sm font-bold mt-1">{property.bedrooms}</p>
                      <p className="text-[10px] text-muted-foreground">Bedrooms</p>
                    </div>
                  )}
                  {property.bathrooms != null && (
                    <div className="text-center p-2.5 bg-muted/30 rounded-xl border border-border/30">
                      <Bath className="w-4 h-4 mx-auto text-primary/70" />
                      <p className="text-sm font-bold mt-1">{property.bathrooms}</p>
                      <p className="text-[10px] text-muted-foreground">Bathrooms</p>
                    </div>
                  )}
                  {property.surface != null && (
                    <div className="text-center p-2.5 bg-muted/30 rounded-xl border border-border/30">
                      <Ruler className="w-4 h-4 mx-auto text-primary/70" />
                      <p className="text-sm font-bold mt-1">{property.surface}</p>
                      <p className="text-[10px] text-muted-foreground">{property.surface_unit || "m²"}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="capitalize text-xs">{property.property_type}</Badge>
                  {property.monthly_rent != null && <Badge variant="secondary" className="text-xs">{property.monthly_rent}€/mo</Badge>}
                  {property.furnished && <Badge variant="outline" className="text-xs">Furnished</Badge>}
                </div>
              </CardContent>
            </Card>

            {/* Quick actions: Orbit + Wallet */}
            <div className="grid grid-cols-2 gap-3">
              <Link to="/orbit">
                <Button variant="outline" className="w-full gap-2 h-11 border-border/50">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs">Contact via Orbit</span>
                </Button>
              </Link>
              <Link to="/wallet">
                <Button variant="outline" className="w-full gap-2 h-11 border-border/50">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs">Rent Payments</span>
                </Button>
              </Link>
            </div>

            {/* Units */}
            {units && units.length > 0 && (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Home className="w-4 h-4 text-primary/70" /> Units ({units.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {units.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0 text-sm">
                      <div>
                        <p className="font-medium">Unit {u.unit_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.bedrooms != null && `${u.bedrooms} bed`}{u.size_sqm != null && ` · ${u.size_sqm}m²`}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        {u.rent_amount != null && u.rent_amount > 0 && (
                          <span className="text-sm font-bold">{u.rent_amount} {u.currency}</span>
                        )}
                        <Badge variant="outline" className="text-[10px] capitalize">{u.status}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            {docs && docs.length > 0 && (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary/70" /> Documents ({docs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {docs.map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 text-sm">
                      <span className="truncate">{d.title || d.doc_type}</span>
                      {d.file_url && (
                        <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
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
