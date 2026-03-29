/**
 * AICategorySuggest — Module 6: AI-powered category suggestion from business description.
 * Uses Lovable AI (Gemini Flash) to suggest vertical/category/subcategory/tags.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as storefrontRepo from "@/repositories/storefront.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Check, Tag } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId?: string;
  onAccept?: (suggestion: { vertical: string; category: string; subcategory: string; tags: string[] }) => void;
}

export default function AICategorySuggest({ shopId, onAccept }: Props) {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    vertical: string; category: string; subcategory: string; tags: string[];
  } | null>(null);

  // Load existing verticals/categories for reference
  const { data: verticals = [] } = useQuery({
    queryKey: ["verticals"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("verticals").select("slug, name").eq("active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("categories").select("slug, name, vertical_id, verticals(slug)").eq("active", true).order("sort_order");
      return data || [];
    },
  });

  const handleSuggest = async () => {
    if (!input.trim()) { toast.error("Enter a business description"); return; }
    setLoading(true);
    setSuggestion(null);

    try {
      const verticalSlugs = verticals.map((v: any) => v.slug).join(", ");
      const categorySlugs = categories.map((c: any) => c.slug).join(", ");

      // Use edge function with Lovable AI
      const data = await storefrontRepo.invokeAICategorySuggest({
        description: input.trim(),
        available_verticals: verticalSlugs,
        available_categories: categorySlugs,
      });

      if (error) throw error;

      const result = data?.suggestion || {
        vertical: "shops",
        category: "general",
        subcategory: "",
        tags: input.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 5),
      };

      setSuggestion(result);

      // Save suggestion
      if (user) {
        await (supabase as any).from("ai_category_suggestions").insert({
          shop_id: shopId || null,
          user_id: user.id,
          input_text: input.trim(),
          suggested_vertical: result.vertical,
          suggested_category: result.category,
          suggested_subcategory: result.subcategory,
          suggested_tags: result.tags,
        });
      }
    } catch {
      // Fallback: simple keyword-based suggestion
      const lower = input.toLowerCase();
      let vertical = "shops";
      let category = "general";
      const tags = input.split(/[\s,]+/).filter(w => w.length > 3).slice(0, 5);

      if (/restaurant|pizza|burger|sushi|food|kitchen|chef|cook/i.test(lower)) { vertical = "food"; category = "restaurant"; }
      else if (/cafe|coffee|tea|bakery|pastry/i.test(lower)) { vertical = "food"; category = "cafe"; }
      else if (/grocery|supermarket|organic|market/i.test(lower)) { vertical = "grocery"; category = "supermarket"; }
      else if (/clean|repair|plumb|electric|fix/i.test(lower)) { vertical = "services"; category = "repair"; }
      else if (/hotel|travel|tour|transport/i.test(lower)) { vertical = "travel"; category = "hotel"; }
      else if (/cloth|fashion|beauty|cosmetic/i.test(lower)) { vertical = "shops"; category = "clothing"; }
      else if (/tech|phone|computer|electronic/i.test(lower)) { vertical = "shops"; category = "electronics"; }
      else if (/delivery|shipping|courier/i.test(lower)) { vertical = "services"; category = "delivery"; }
      else if (/job|hire|recruit|career/i.test(lower)) { vertical = "jobs"; category = "general"; }
      else if (/rent|property|apartment|house|real estate/i.test(lower)) { vertical = "property"; category = "general"; }

      const result = { vertical, category, subcategory: "", tags };
      setSuggestion(result);

      if (user) {
        await (supabase as any).from("ai_category_suggestions").insert({
          shop_id: shopId || null,
          user_id: user.id,
          input_text: input.trim(),
          suggested_vertical: vertical,
          suggested_category: category,
          suggested_subcategory: "",
          suggested_tags: tags,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (suggestion) {
      onAccept?.(suggestion);
      toast.success("Category applied!");
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> AI Category Suggestion
        </h4>
        <div>
          <Label className="text-xs">Describe your business</Label>
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="e.g., pizza restaurant delivery dubai marina"
            rows={2}
            className="mt-1 text-xs"
          />
        </div>
        <Button size="sm" className="w-full gap-1.5 text-xs" onClick={handleSuggest} disabled={loading || !input.trim()}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Suggest Category
        </Button>

        {suggestion && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Vertical</span>
                <p className="font-medium">{suggestion.vertical}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Category</span>
                <p className="font-medium">{suggestion.category}</p>
              </div>
              {suggestion.subcategory && (
                <div>
                  <span className="text-muted-foreground">Subcategory</span>
                  <p className="font-medium">{suggestion.subcategory}</p>
                </div>
              )}
            </div>
            {suggestion.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {suggestion.tags.map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-[9px] gap-1">
                    <Tag className="h-2 w-2" /> {t}
                  </Badge>
                ))}
              </div>
            )}
            <Button size="sm" variant="outline" className="w-full text-xs gap-1" onClick={handleAccept}>
              <Check className="h-3 w-3" /> Apply Suggestion
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
