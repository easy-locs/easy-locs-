/**
 * URL Import Page — Admin UI for the URL→Shop pipeline.
 * Paste a business URL → scan → extract → canonical mapping → quality scoring → publish.
 */
import { useState } from "react";
import { Globe, Loader2, CheckCircle2, AlertTriangle, ArrowRight, Store, Star, Image, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { runAndPersistOnboarding } from "@/lib/onboarding/run-onboarding";
import type { Vertical } from "@/lib/onboarding/types";

type PipelineStep = "idle" | "scanning" | "extracting" | "mapping" | "scoring" | "done" | "error";

const VERTICALS: { value: Vertical; label: string; icon: string }[] = [
  { value: "food", label: "Food & Restaurant", icon: "🍕" },
  { value: "hotel", label: "Hotel & Stays", icon: "🏨" },
  { value: "grocery", label: "Grocery & Retail", icon: "🛒" },
  { value: "services", label: "Services", icon: "🔧" },
  { value: "property", label: "Property", icon: "🏠" },
];

const STEP_LABELS: Record<string, string> = {
  idle: "Ready",
  scanning: "Scanning website...",
  extracting: "Extracting data...",
  mapping: "Mapping to canonical model...",
  scoring: "Quality scoring...",
  done: "Pipeline complete",
  error: "Pipeline error",
};

export default function UrlImportPage() {
  const [url, setUrl] = useState("");
  const [vertical, setVertical] = useState<Vertical>("food");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [step, setStep] = useState<PipelineStep>("idle");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const progressMap: Record<PipelineStep, number> = {
    idle: 0, scanning: 20, extracting: 45, mapping: 65, scoring: 85, done: 100, error: 0,
  };

  const handleRun = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL or business name");
      return;
    }

    setError(null);
    setResults(null);

    try {
      setStep("scanning");
      setProgress(20);
      await new Promise((r) => setTimeout(r, 400));

      setStep("extracting");
      setProgress(45);
      await new Promise((r) => setTimeout(r, 300));

      setStep("mapping");
      setProgress(65);

      const result = await runAndPersistOnboarding({
        vertical,
        website: url.startsWith("http") ? url : undefined,
        name: !url.startsWith("http") ? url : undefined,
        query: url,
        city: city || undefined,
        country: country || undefined,
      });

      setStep("scoring");
      setProgress(85);
      await new Promise((r) => setTimeout(r, 300));

      setResults(result);
      setStep("done");
      setProgress(100);
      const traceMs = result.trace?.totalDurationMs ?? 0;
      toast.success(`Pipeline complete — ${result.canonical?.length ?? 0} entities in ${traceMs}ms`);
    } catch (e: any) {
      setStep("error");
      setError(e?.message ?? "Pipeline failed");
      toast.error("Pipeline failed");
    }
  };

  const isRunning = ["scanning", "extracting", "mapping", "scoring"].includes(step);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            URL → Shop Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paste a URL or business name to auto-import into the platform
          </p>
        </div>

        {/* Input Card */}
        <Card className="border-border/30">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Business URL or Name</label>
              <div className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://restaurant.com or 'Pizza Napoli Dubai'"
                  className="flex-1"
                  disabled={isRunning}
                />
                <Button onClick={handleRun} disabled={isRunning || !url.trim()} className="shrink-0">
                  {isRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                  {isRunning ? "Running..." : "Import"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Vertical</label>
                <Select value={vertical} onValueChange={(v) => setVertical(v as Vertical)} disabled={isRunning}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VERTICALS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.icon} {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">City (optional)</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Dubai" disabled={isRunning} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Country (optional)</label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="AE" disabled={isRunning} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <AnimatePresence>
          {step !== "idle" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="border-border/30">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{STEP_LABELS[step]}</span>
                    {step === "done" && <CheckCircle2 className="w-5 h-5 text-success" />}
                    {step === "error" && <AlertTriangle className="w-5 h-5 text-destructive" />}
                  </div>
                  <Progress value={progress} className="h-2" />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {results && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {results.canonical?.map((entity: any, i: number) => (
                <Card key={entity.entityId || i} className="border-border/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base font-bold break-words">
                          <Store className="w-4 h-4 inline mr-1.5 text-primary" />
                          {entity.canonicalName || "Unknown Entity"}
                        </CardTitle>
                        {entity.address && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {[entity.address, entity.district, entity.city, entity.country].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {results.publish?.[i] && (
                          <Badge variant={results.publish[i].allowed ? "default" : "secondary"}>
                            {results.publish[i].allowed ? "Ready to Publish" : "Draft"}
                          </Badge>
                        )}
                        {results.publish?.[i]?.qualityScore != null && (
                          <span className="text-xs font-bold flex items-center gap-1">
                            <Star className="w-3 h-3 text-accent" />
                            {results.publish[i].qualityScore}/100
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Categories */}
                    {entity.categories?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entity.categories.map((cat: string) => (
                          <Badge key={cat} variant="outline" className="text-[10px]">{cat}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {entity.menuItems?.length > 0 && (
                        <span>📋 {entity.menuItems.length} menu items</span>
                      )}
                      {entity.hotelInventory?.length > 0 && (
                        <span>🛏️ {entity.hotelInventory.length} rooms</span>
                      )}
                      {entity.serviceItems?.length > 0 && (
                        <span>🔧 {entity.serviceItems.length} services</span>
                      )}
                      {entity.photos?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Image className="w-3 h-3" /> {entity.photos.length} photos
                        </span>
                      )}
                    </div>

                    {/* Publish gate reasons */}
                    {results.publish?.[i]?.reasons?.length > 0 && (
                      <div className="text-[11px] text-muted-foreground space-y-0.5">
                        {results.publish[i].reasons.map((r: string, j: number) => (
                          <p key={j}>• {r}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {results.canonical?.length === 0 && (
                <Card className="border-border/30">
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">No entities found for this input</p>
                  </CardContent>
                </Card>
              )}

              {/* Pipeline Trace */}
              {results.trace && (
                <Card className="border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">
                      Pipeline Trace — {results.trace.totalDurationMs}ms total
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {results.trace.steps?.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-mono">
                        <span className={s.success ? "text-green-500" : "text-destructive"}>
                          {s.success ? "✓" : "✗"}
                        </span>
                        <span className="text-foreground flex-1 truncate">{s.name}</span>
                        <span className="text-muted-foreground">{s.durationMs}ms</span>
                        {s.outputSummary && (
                          <span className="text-muted-foreground/60 truncate max-w-[200px]">{s.outputSummary}</span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
