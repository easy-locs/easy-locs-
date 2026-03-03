import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link2, Copy, Check, ExternalLink, Eye, EyeOff } from "lucide-react";

interface ListingManagerProps {
  propertyId: string;
  propertyLabel: string;
}

const ListingManager = ({ propertyId, propertyLabel }: ListingManagerProps) => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price_per_night: 0,
    min_nights: 1,
    max_guests: 4,
  });

  const load = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("public_listings")
      .select("*")
      .eq("property_id", propertyId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (data) {
      setListing(data);
      setForm({
        title: data.title || "",
        description: data.description || "",
        price_per_night: data.price_per_night || 0,
        min_nights: data.min_nights || 1,
        max_guests: data.max_guests || 4,
      });
    }
    setLoading(false);
  }, [propertyId, orgId]);

  useEffect(() => { load(); }, [load]);

  const generateSlug = () => {
    const base = propertyLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
    return `${base}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const createListing = async () => {
    if (!orgId || !user) return;
    const slug = generateSlug();
    const { data, error } = await supabase.from("public_listings").insert({
      property_id: propertyId,
      org_id: orgId,
      user_id: user.id,
      slug,
      title: form.title || propertyLabel,
      description: form.description,
      price_per_night: form.price_per_night,
      min_nights: form.min_nights,
      max_guests: form.max_guests,
    } as any).select().single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setListing(data);
    toast({ title: "Annonce créée ! Lien public disponible." });
  };

  const updateListing = async () => {
    if (!listing) return;
    const { error } = await supabase.from("public_listings").update({
      title: form.title,
      description: form.description,
      price_per_night: form.price_per_night,
      min_nights: form.min_nights,
      max_guests: form.max_guests,
    } as any).eq("id", listing.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Annonce mise à jour" });
    load();
  };

  const toggleActive = async () => {
    if (!listing) return;
    await supabase.from("public_listings").update({ active: !listing.active } as any).eq("id", listing.id);
    toast({ title: listing.active ? "Annonce désactivée" : "Annonce activée" });
    load();
  };

  const getPublicUrl = () => {
    const base = window.location.origin;
    return `${base}/listing/${listing?.slug}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(getPublicUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Lien copié !" });
  };

  if (loading) return <div className="text-sm text-muted-foreground">Chargement…</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Link2 className="h-4 w-4 text-accent" /> Annonce publique
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Titre de l'annonce</label>
          <input
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder={propertyLabel}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Prix / nuit (€)</label>
          <input
            type="number"
            value={form.price_per_night || ""}
            onChange={e => setForm(p => ({ ...p, price_per_night: +e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Nuits minimum</label>
          <input
            type="number"
            value={form.min_nights}
            onChange={e => setForm(p => ({ ...p, min_nights: +e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Voyageurs max</label>
          <input
            type="number"
            value={form.max_guests}
            onChange={e => setForm(p => ({ ...p, max_guests: +e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={3}
            placeholder="Décrivez votre bien pour les voyageurs…"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1 resize-none"
          />
        </div>
      </div>

      {!listing ? (
        <button
          onClick={createListing}
          className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Créer l'annonce et générer le lien
        </button>
      ) : (
        <div className="space-y-3">
          <button
            onClick={updateListing}
            className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Mettre à jour l'annonce
          </button>

          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
            <Link2 className="h-4 w-4 text-accent shrink-0" />
            <span className="text-xs text-foreground truncate flex-1 font-mono">{getPublicUrl()}</span>
            <button onClick={copyLink} className="p-1.5 rounded hover:bg-muted">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
            <a href={getPublicUrl()} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-muted">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>

          <button
            onClick={toggleActive}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {listing.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {listing.active ? "Désactiver l'annonce" : "Réactiver l'annonce"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ListingManager;
