import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { importDubaiRestaurants, type ImportResult } from "@/lib/import/dubai-restaurant-importer";
import { DUBAI_RESTAURANTS } from "@/lib/import/dubai-restaurant-seeds";
import { Upload, CheckCircle, AlertTriangle, Store, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function DubaiRestaurantImportPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    setLoading(true);
    try {
      const res = await importDubaiRestaurants();
      setResult(res);
      if (res.errors.length === 0) {
        toast.success(`${res.imported} restaurants importés avec succès`);
      } else {
        toast.warning(`${res.imported} importés, ${res.errors.length} erreurs`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sourceColor = (s: string) =>
    s === "google_maps" ? "bg-red-100 text-red-800" :
    s === "deliveroo" ? "bg-teal-100 text-teal-800" :
    "bg-orange-100 text-orange-800";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">🇦🇪 Auto-Import Restaurants — Dubai</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Importer {DUBAI_RESTAURANTS.length} restaurants depuis Google Maps, Deliveroo et Careem (données mock).
          Chaque restaurant sera créé avec statut <strong>imported_not_claimed</strong> et mode <strong>coming soon</strong>.
        </p>

        <div className="flex gap-3 mb-6">
          <Button onClick={handleImport} disabled={loading} size="lg">
            <Upload className="h-4 w-4 mr-2" />
            {loading ? "Import en cours…" : "Lancer l'import"}
          </Button>
        </div>

        {result && (
          <Card className="mb-6 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {result.errors.length === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
                Résultat de l'import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{result.imported}</div>
                  <div className="text-green-600 text-xs">Importés</div>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <div className="text-2xl font-bold">{result.skipped}</div>
                  <div className="text-muted-foreground text-xs">Déjà existants</div>
                </div>
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-center">
                  <div className="text-2xl font-bold text-red-700">{result.errors.length}</div>
                  <div className="text-red-600 text-xs">Erreurs</div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-3 bg-destructive/10 rounded p-3 text-destructive text-xs space-y-1">
                  {result.errors.map((e, i) => <div key={i}>• {e}</div>)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <h2 className="text-lg font-semibold mb-3">Restaurants à importer ({DUBAI_RESTAURANTS.length})</h2>
        <div className="grid gap-3">
          {DUBAI_RESTAURANTS.map((r) => (
            <Card key={r.source_external_id} className="border-border/50">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{r.merchant_name}</span>
                    <Badge variant="outline" className={`text-[10px] ${sourceColor(r.source)}`}>
                      {r.source === "google_maps" ? "Google" : r.source === "deliveroo" ? "Deliveroo" : "Careem"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {r.area}
                    </span>
                    <span>🍽 {r.cuisine_type}</span>
                    <span>{r.menu_items.length} items</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
