/**
 * SmartShopBuilder — PASS102: AI-powered shop creation.
 * Auto-generates slug, categories, tags, SEO from name+description.
 * Uses Lovable AI (Gemini Flash) for instant business classification.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEnsureOrg } from "@/hooks/useEnsureOrg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Loader2, Sparkles, Zap, Check, Tag } from "lucide-react";
import { toast } from "sonner";

interface AISuggestion {
  vertical: string;
  category: string;
  tags: string[];
  tagline: string;
  seo_description: string;
}

export default function SmartShopBuilder() {
  const { user } = useAuth();
  const { ensureOrg, creating: orgCreating } = useEnsureOrg();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);

  const handleAISuggest = async () => {
    if (!name.trim()) { toast.error("Enter a shop name first"); return; }
    setAiLoading(true);
    try {
      const { data } = await supabase.functions.invoke("ai-proxy", {
        body: {
          model: "google/gemini-2.5-flash-lite",
          messages: [{
            role: "user",
            content: `Classify this business for an e-commerce platform. Return ONLY valid JSON.
Business: "${name}" — ${description || "no description"}
City: ${city || "unknown"}, Country: ${country || "unknown"}

Return: {"vertical":"food|shops|services|health|beauty|tech|fashion|home|sports|education|automotive|other","category":"specific category","tags":["tag1","tag2","tag3"],"tagline":"catchy tagline under 60 chars","seo_description":"SEO meta description under 155 chars"}`
          }],
        },
      });
      const text = data?.choices?.[0]?.message?.content || data?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setSuggestion(parsed);
        if (!description && parsed.tagline) setDescription(parsed.tagline);
        toast.success("AI suggestions ready!");
      }
    } catch {
      toast.error("AI suggestion failed — you can continue manually");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Shop name is required"); return; }
    if (!user) { toast.error("Please sign in first"); return; }
    setLoading(true);
    try {
      const orgId = await ensureOrg();
      if (!orgId) { toast.error("Failed to set up organization"); return; }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      const { error } = await (supabase as any)
        .from("storefront_pages")
        .insert({
          org_id: orgId,
          user_id: user.id,
          slug,
          name: name.trim(),
          tagline: suggestion?.tagline || "",
          description: description.trim() || suggestion?.seo_description || "",
          city: city.trim() || "",
          country: country.trim() || "",
          contact_email: user.email || "",
          shop_visibility: "public",
          vertical: suggestion?.vertical || "shops",
          tags: suggestion?.tags || [],
          seo_description: suggestion?.seo_description || "",
        })
        .select("slug")
        .single();

      if (error) {
        if (error.code === "23505") toast.error("This shop name is already taken");
        else toast.error(error.message);
        return;
      }

      toast.success("Shop created! 🎉");
      navigate(`/dashboard/my-shop`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Store className="h-5 w-5 text-primary" />
          Smart Shop Builder
        </CardTitle>
        <p className="text-xs text-muted-foreground">AI-powered shop creation in under 2 minutes</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">Shop Name *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pizza House, Beauty Studio..." className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell customers about your business..." className="mt-1" rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">City</Label><Input value={city} onChange={e => setCity(e.target.value)} placeholder="Dubai" className="mt-1" /></div>
          <div><Label className="text-xs">Country</Label><Input value={country} onChange={e => setCountry(e.target.value)} placeholder="UAE" className="mt-1" /></div>
        </div>

        {/* AI Suggest Button */}
        <Button variant="outline" className="w-full h-9 text-xs gap-2" onClick={handleAISuggest} disabled={aiLoading || !name.trim()}>
          {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
          {aiLoading ? "Analyzing..." : "Auto-classify with AI"}
        </Button>

        {/* AI Suggestions */}
        {suggestion && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Zap className="h-3 w-3" /> AI Suggestions
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[10px]">{suggestion.vertical}</Badge>
                <Badge variant="outline" className="text-[10px]">{suggestion.category}</Badge>
                {suggestion.tags.map(t => (
                  <Badge key={t} variant="outline" className="text-[10px] gap-0.5">
                    <Tag className="h-2 w-2" /> {t}
                  </Badge>
                ))}
              </div>
              {suggestion.tagline && <p className="text-[11px] text-muted-foreground italic">"{suggestion.tagline}"</p>}
              <div className="flex items-center gap-1 text-[10px] text-success">
                <Check className="h-2.5 w-2.5" /> Will be applied on creation
              </div>
            </CardContent>
          </Card>
        )}

        <Button className="w-full h-11 font-semibold gap-2" onClick={handleCreate} disabled={loading || orgCreating || !name.trim()}>
          {loading || orgCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Create Shop
        </Button>
      </CardContent>
    </Card>
  );
}
