/**
 * TranslationManager — Module 15: Manage shop translations.
 * Supports: en, fr, ar, es, zh
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages, Plus, Save, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props { shopId: string; }

const LOCALES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

const FIELDS = [
  { key: "name", label: "Shop Name" },
  { key: "description", label: "Description" },
  { key: "tagline", label: "Tagline" },
];

export default function TranslationManager({ shopId }: Props) {
  const qc = useQueryClient();
  const [locale, setLocale] = useState("fr");
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const { data: translations = [], isLoading } = useQuery({
    queryKey: ["shop-translations", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_translations")
        .select("*").eq("shop_id", shopId);
      return data || [];
    },
  });

  const currentTranslations = translations.filter((t: any) => t.locale === locale);
  const getValue = (field: string) => edits[field] ?? currentTranslations.find((t: any) => t.field_name === field)?.field_value ?? "";

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [field, value] of Object.entries(edits)) {
        if (!value.trim()) continue;
        await (supabase as any).from("storefront_translations").upsert({
          shop_id: shopId,
          locale,
          field_name: field,
          field_value: value.trim(),
        }, { onConflict: "shop_id,locale,field_name" });
      }
      qc.invalidateQueries({ queryKey: ["shop-translations", shopId] });
      setEdits({});
      toast.success("Translations saved");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from("storefront_translations").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["shop-translations", shopId] });
    toast.success("Translation removed");
  };

  const localeStats = LOCALES.map(l => ({
    ...l,
    count: translations.filter((t: any) => t.locale === l.code).length,
  }));

  const hasEdits = Object.keys(edits).length > 0;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Languages className="h-4 w-4 text-primary" /> Translations
      </h4>

      {/* Locale stats */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {localeStats.map(l => (
          <button
            key={l.code}
            onClick={() => { setLocale(l.code); setEdits({}); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-all ${
              locale === l.code ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/50 text-muted-foreground"
            }`}
          >
            {l.flag} {l.label}
            {l.count > 0 && <Badge variant="secondary" className="text-[8px] ml-0.5">{l.count}</Badge>}
          </button>
        ))}
      </div>

      {/* Fields */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <p className="text-[10px] text-muted-foreground">
            Translating to: <strong>{LOCALES.find(l => l.code === locale)?.flag} {LOCALES.find(l => l.code === locale)?.label}</strong>
          </p>

          {FIELDS.map(f => (
            <div key={f.key}>
              <Label className="text-xs">{f.label}</Label>
              <Input
                value={getValue(f.key)}
                onChange={e => setEdits(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="mt-1 text-xs"
                placeholder={`${f.label} in ${LOCALES.find(l => l.code === locale)?.label}`}
                dir={locale === "ar" ? "rtl" : "ltr"}
              />
            </div>
          ))}

          {hasEdits && (
            <Button size="sm" className="w-full text-xs gap-1" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save Translations
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Existing translations */}
      {currentTranslations.length > 0 && (
        <div className="space-y-1">
          {currentTranslations.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
              <div className="min-w-0 flex-1">
                <span className="text-muted-foreground">{t.field_name}: </span>
                <span className="font-medium" dir={locale === "ar" ? "rtl" : "ltr"}>{t.field_value}</span>
              </div>
              <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive shrink-0" onClick={() => handleDelete(t.id)}>
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
