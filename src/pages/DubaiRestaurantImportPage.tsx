import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { importDubaiRestaurantsV2, type ImportProgress } from "@/lib/import/dubai-restaurant-importer-v2";
import { CATEGORIES, DUBAI_AREAS } from "@/lib/import/dubai-restaurant-generator";
import { Upload, CheckCircle, AlertTriangle, Store, MapPin, Utensils } from "lucide-react";
import { toast } from "sonner";

export default function DubaiRestaurantImportPage() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [count, setCount] = useState(300);

  const handleImport = useCallback(async () => {
    setLoading(true);
    setProgress(null);
    try {
      const res = await importDubaiRestaurantsV2(count, setProgress);
      if (res.errors.length === 0) {
        toast.success(`${res.imported} restaurants importés avec succès !`);
      } else {
        toast.warning(`${res.imported} importés, ${res.errors.length} erreurs`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [count]);

  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            🇦🇪 Auto-Import Dubai Marketplace
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Peuplez le marketplace avec {count} restaurants réalistes — profils marchands, menus, et vitrines publiques.
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Nombre de restaurants</label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  disabled={loading}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value={50}>50 (test rapide)</option>
                  <option value={150}>150</option>
                  <option value={300}>300 (recommandé)</option>
                  <option value={500}>500 (full)</option>
                </select>
              </div>
              <Button onClick={handleImport} disabled={loading} size="lg">
                <Upload className="h-4 w-4 mr-2" />
                {loading ? "Import en cours…" : "Lancer l'import"}
              </Button>
            </div>

            {/* Progress */}
            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{progress.current} / {progress.total}</span>
                  <span>{pct}%</span>
                </div>
                <Progress value={pct} className="h-3" />
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="text-green-600 font-medium">✓ {progress.imported} importés</span>
                  <span>⏭ {progress.skipped} existants</span>
                  {progress.errors.length > 0 && (
                    <span className="text-destructive">✗ {progress.errors.length} erreurs</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Result summary */}
        {progress?.done && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {progress.errors.length === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
                Import terminé
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg bg-green-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{progress.imported}</div>
                  <div className="text-green-600 text-xs">Importés</div>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <div className="text-2xl font-bold text-foreground">{progress.skipped}</div>
                  <div className="text-muted-foreground text-xs">Déjà existants</div>
                </div>
                <div className="rounded-lg bg-destructive/10 p-3 text-center">
                  <div className="text-2xl font-bold text-destructive">{progress.errors.length}</div>
                  <div className="text-destructive text-xs">Erreurs</div>
                </div>
              </div>
              {progress.errors.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Voir les {progress.errors.length} erreurs
                  </summary>
                  <div className="mt-2 max-h-40 overflow-auto bg-destructive/5 rounded p-3 space-y-1">
                    {progress.errors.slice(0, 50).map((e, i) => (
                      <div key={i} className="text-destructive">• {e}</div>
                    ))}
                    {progress.errors.length > 50 && (
                      <div className="text-muted-foreground">… et {progress.errors.length - 50} autres</div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        )}

        {/* Categories overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Utensils className="h-4 w-4" /> Catégories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Badge
                  key={c.key}
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: c.themeColor, color: c.themeColor }}
                >
                  {c.label} — {c.menuTemplate.length} items template
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Areas coverage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Zones couvertes ({DUBAI_AREAS.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {DUBAI_AREAS.map((a) => (
                <Badge key={a.name} variant="secondary" className="text-xs">
                  {a.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
