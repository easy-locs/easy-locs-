/**
 * ShopCreator — Quick shop creation form (< 2 minutes).
 * Auto-generates slug, creates org if needed.
 */
import { useState } from "react";
import { validateShop } from "@/lib/validation/marketplace-validators";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEnsureOrg } from "@/hooks/useEnsureOrg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ShopCreator() {
  const { user } = useAuth();
  const { ensureOrg, creating: orgCreating } = useEnsureOrg();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const handleCreate = async () => {
    // V4: Validate shop with logo requirement
    const validation = validateShop({ name, logo_url: logoUrl || null });
    if (!validation.valid) {
      validation.errors.forEach(e => toast.error(e));
      return;
    }
    if (!user) { toast.error("Please sign in first"); return; }

    setLoading(true);
    try {
      const orgId = await ensureOrg();
      if (!orgId) { toast.error("Failed to set up organization"); return; }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      const { data, error } = await (supabase as any)
        .from("storefront_pages")
        .insert({
          org_id: orgId,
          user_id: user.id,
          slug,
          name: name.trim(),
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          city: city.trim() || "",
          country: country.trim() || "",
          contact_email: user.email || "",
          shop_visibility: "public",
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
    } catch (err) {
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
          Create Your Shop
        </CardTitle>
        <p className="text-xs text-muted-foreground">Set up your mini store in under 2 minutes</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">Shop Name *</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Pizza House, Beauty Studio..."
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Tagline</Label>
          <Input
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            placeholder="Short description in a few words"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tell customers about your business..."
            className="mt-1"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">City</Label>
            <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Dubai" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Country</Label>
            <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="UAE" className="mt-1" />
          </div>
        </div>
        <Button
          className="w-full h-11 font-semibold gap-2"
          onClick={handleCreate}
          disabled={loading || orgCreating || !name.trim()}
        >
          {loading || orgCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Create Shop
        </Button>
      </CardContent>
    </Card>
  );
}
